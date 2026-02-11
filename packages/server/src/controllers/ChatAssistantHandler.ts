/**
 * ChatAssistantHandler - Handles @Chat mention triggers and response dispatching
 */

import type { Server } from "socket.io";
import type { ChatOrchestrator } from "@ai-chat/core";
import type { ChatAssistantService } from "@/services/ChatAssistantService.js";
import type {
  ChatAssistantMetadata,
  ChatAssistantOrigin,
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
      if (assistantName && origin.sender && origin.sender === assistantName) return;
    }

    try {
      const recentMessages = await this.getRecentMessages(roomId);
      const historyLimit = this.chatAssistantService.chatHistoryLimit ?? 5;
      const chatHistory = Array.isArray(recentMessages)
        ? recentMessages.slice(-historyLimit)
        : [];

      const result = await this.chatAssistantService.createResponseFromContent(
        content,
        { emitter: this.io, roomId, chatHistory },
      );
      if (!result?.answer) return;

      if (result.error) {
        console.warn(
          "Chat assistant encountered an issue:",
          result.error?.message || result.error,
        );
      }

      const messageId = `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const message: ChatMessage = {
        ...this.chatAssistantMetadata,
        content: result.answer,
        senderType: "ai",
        roomId,
        priority: 800,
        isInternalResponder: true,
        suppressAIResponses: true,
        mentionsTriggerSender:
          origin.type === "user" ? origin.username : origin.sender || null,
        contextQuestion: result.question,
        timestamp: Date.now(),
        id: messageId,
      };

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
    } catch (error) {
      console.error(
        "Failed to dispatch chat assistant response:",
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
