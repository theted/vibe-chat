/**
 * ChatAssistantHandler - Handles @Chat mention triggers and response dispatching
 */

import type { Server } from "socket.io";
import type { ChatOrchestrator } from "@ai-chat/core";
import {
  CHAT_ASSISTANT_AI_COOLDOWN_MS,
  CHAT_ASSISTANT_BUSY_NOTICE,
} from "@/config/serverConfig.js";
import { describeError } from "@/utils/socketErrors.js";
import type { ChatAssistantService } from "@/services/ChatAssistantService.js";
import type {
  ChatAssistantMetadata,
  ChatMessage,
  TriggerChatAssistantPayload,
} from "@/types.js";

type RecentMessagesFn = (roomId: string) => Promise<ChatMessage[]>;

/**
 * Encapsulates the @Chat assistant trigger/response lifecycle so
 * SocketController stays focused on socket events.
 */
export class ChatAssistantHandler {
  private chatAssistantService: ChatAssistantService | null;
  private chatAssistantMetadata: ChatAssistantMetadata | null;
  private chatOrchestrator: ChatOrchestrator;
  private io: Server;
  private getRecentMessages: RecentMessagesFn;
  /** Rooms with an answer in progress - one agent run per room at a time */
  private busyRooms = new Set<string>();
  /** Room -> when an AI-asked question was last accepted */
  private lastAIQuestionAt = new Map<string, number>();

  constructor(options: {
    chatAssistantService: ChatAssistantService | null;
    chatOrchestrator: ChatOrchestrator;
    io: Server;
    getRecentMessages: RecentMessagesFn;
  }) {
    this.chatAssistantService = options.chatAssistantService;
    this.chatAssistantMetadata = this.chatAssistantService
      ? this.chatAssistantService.getMetadata()
      : null;
    this.chatOrchestrator = options.chatOrchestrator;
    this.io = options.io;
    this.getRecentMessages = options.getRecentMessages;
  }

  get metadata(): ChatAssistantMetadata | null {
    return this.chatAssistantMetadata;
  }

  get service(): ChatAssistantService | null {
    return this.chatAssistantService;
  }

  shouldHandle(content: string): boolean {
    return (
      !!this.chatAssistantService &&
      this.chatAssistantService.shouldHandle({ content })
    );
  }

  async trigger({
    roomId,
    content,
    origin = {},
  }: TriggerChatAssistantPayload): Promise<void> {
    if (!this.chatAssistantService || !this.chatAssistantMetadata || !content) {
      return;
    }

    if (!this.chatAssistantService.shouldHandle({ content })) {
      return;
    }

    if (origin.type === "ai") {
      if (origin.isInternalResponder) return;
      const assistantId = this.chatAssistantMetadata?.aiId;
      const assistantName = this.chatAssistantMetadata?.displayName;
      if (assistantId && origin.aiId && origin.aiId === assistantId) return;
      if (assistantName && origin.sender && origin.sender === assistantName)
        return;
    }

    if (this.busyRooms.has(roomId)) {
      console.info(
        `[ChatAssistant] Skipping question in ${roomId}: already answering one.`,
      );
      if (origin.type === "user") {
        await this.postBusyNotice(roomId, origin);
      }
      return;
    }
    if (origin.type === "ai") {
      const elapsed = Date.now() - (this.lastAIQuestionAt.get(roomId) ?? 0);
      if (elapsed < CHAT_ASSISTANT_AI_COOLDOWN_MS) {
        console.info(
          `[ChatAssistant] Skipping AI question in ${roomId}: cooldown (${Math.round(elapsed / 1000)}s since the last one).`,
        );
        return;
      }
      this.lastAIQuestionAt.set(roomId, Date.now());
    }

    this.busyRooms.add(roomId);
    try {
      const recentMessages = await this.getRecentMessages(roomId);
      const historyLimit = this.chatAssistantService.chatHistoryLimit ?? 5;
      const chatHistory = Array.isArray(recentMessages)
        ? recentMessages.slice(-historyLimit)
        : [];

      const askedBy = origin.type === "user" ? origin.username : origin.sender;
      const result = await this.chatAssistantService.createResponseFromContent(
        content,
        { emitter: this.io, roomId, chatHistory, askedBy },
      );
      if (!result?.answer) return;

      if (result.error) {
        console.warn(
          "Chat assistant encountered an issue:",
          result.error?.message || result.error,
        );
      }

      const message = this.buildMessage(roomId, result.answer, origin, {
        contextQuestion: result.question,
      });

      const originLabel =
        origin.type === "user"
          ? `user "${origin.username}"`
          : origin.sender
            ? `AI "${origin.sender}"`
            : "trigger";

      console.info(
        `[ChatAssistant] Dispatching answer for ${originLabel} (question: "${result.question}")`,
      );

      await this.chatOrchestrator.handleMessage(message);

      // An AI asker was told to wait for the answer. Schedule a round now,
      // while the answer (which @mentions the asker) is still the latest
      // message, so the asker is picked first instead of whoever the next
      // background tick lands on.
      if (origin.type === "ai") {
        this.chatOrchestrator.scheduleAIResponses(roomId, false);
      }
    } catch (error) {
      console.error(
        "Failed to dispatch chat assistant response:",
        describeError(error),
      );
    } finally {
      this.busyRooms.delete(roomId);
    }
  }

  private buildMessage(
    roomId: string,
    text: string,
    origin: TriggerChatAssistantPayload["origin"] = {},
    extra: Partial<ChatMessage> = {},
  ): ChatMessage {
    return {
      ...this.chatAssistantMetadata,
      content: this.addressToAsker(text, origin),
      senderType: "ai",
      roomId,
      priority: 800,
      isInternalResponder: true,
      suppressAIResponses: true,
      mentionsTriggerSender:
        origin.type === "user" ? origin.username : origin.sender || null,
      timestamp: Date.now(),
      id: `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      ...extra,
    };
  }

  private async postBusyNotice(
    roomId: string,
    origin: TriggerChatAssistantPayload["origin"],
  ): Promise<void> {
    try {
      await this.chatOrchestrator.handleMessage(
        this.buildMessage(roomId, CHAT_ASSISTANT_BUSY_NOTICE, origin),
      );
    } catch (error) {
      console.error(
        "Failed to post chat assistant busy notice:",
        describeError(error),
      );
    }
  }

  /**
   * Prefixes the answer with an @mention of whoever asked. For an AI asker
   * this is what gets the answer back to it: the scheduler gives mentioned
   * AIs priority, so the asker replies next with what it learned.
   */
  private addressToAsker(
    answer: string,
    origin: TriggerChatAssistantPayload["origin"] = {},
  ): string {
    const mention =
      origin.type === "ai"
        ? this.chatOrchestrator.getMentionTokenForAI(
            this.chatOrchestrator.aiServices.get(origin.aiId ?? "") ?? null,
          )
        : origin.username;
    return mention ? `@${mention} ${answer}` : answer;
  }
}
