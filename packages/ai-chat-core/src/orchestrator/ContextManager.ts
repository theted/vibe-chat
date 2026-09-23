/**
 * Context Manager - Handles conversation context with sliding window
 */

import {
  IContextManager,
  ContextMessage,
  ContextManagerConfig,
} from "@/types/orchestrator.js";
import { normalizeRoomId } from "@ai-chat/ai-configs";
import { CONVERSATION_DIGEST } from "./constants.js";
import { excerptForQuote } from "@/utils/orchestrator/responseUtils.js";
import { normalizeAlias, parseMentions } from "@/utils/stringUtils.js";

export class ContextManager implements IContextManager {
  private messages: ContextMessage[] = [];
  private config: ContextManagerConfig;
  /**
   * One-liners of messages evicted from the window, per room - see
   * getConversationDigest. Keyed by room so a private 1-1 chat never folds
   * the main room's history into its prompts, or vice versa.
   */
  private digestsByRoom: Map<string, string[]> = new Map();

  constructor(maxMessages = 100) {
    this.config = {
      maxMessages,
      includeMetadata: true,
      preserveMentions: true,
    };
  }

  /**
   * Add a message to the context
   */
  addMessage(message: ContextMessage): void {
    // Skip internal system messages - they're only for AI prompting
    if (message.isInternal) {
      return;
    }

    const { mentions, normalized } = parseMentions(message.content);

    const displayName = message.displayName || message.sender;
    const alias = message.alias || displayName;
    const normalizedAlias =
      message.normalizedAlias || normalizeAlias(alias ?? "");

    const contextMessage: ContextMessage = {
      // Room is the isolation boundary: a private chat must not see the main
      // room's messages, so every stored message carries one (absent = default).
      roomId: normalizeRoomId(message.roomId),
      role: message.senderType === "user" ? "user" : "assistant",
      content: message.content,
      timestamp: message.timestamp,
      sender: message.sender,
      senderType: message.senderType,
      displayName,
      alias,
      normalizedAlias,
      aiId: message.aiId,
      providerKey: message.providerKey,
      modelKey: message.modelKey,
      mentions,
      mentionsNormalized: normalized,
      id: message.id,
    };

    // The sliding window is per room: a busy main room must not evict a
    // private 1-1 chat's history out from under it.
    const room = contextMessage.roomId as string;
    const roomMessageCount = this.messages.reduce(
      (count, stored) =>
        count + (normalizeRoomId(stored.roomId) === room ? 1 : 0),
      0,
    );
    if (roomMessageCount >= this.config.maxMessages) {
      const oldestIndex = this.messages.findIndex(
        (stored) => normalizeRoomId(stored.roomId) === room,
      );
      if (oldestIndex >= 0) {
        const [evicted] = this.messages.splice(oldestIndex, 1);
        this.addToDigest(evicted);
      }
    }

    this.messages.push(contextMessage);
  }

  /** Fold an evicted message into the rolling digest, dropping the oldest
   *  digest lines once the cap is reached. */
  private addToDigest(message: ContextMessage): void {
    const speaker = message.displayName || message.sender || "Someone";
    const excerpt = excerptForQuote(
      message.content,
      CONVERSATION_DIGEST.EXCERPT_LENGTH,
    );
    if (!excerpt) return;

    const room = normalizeRoomId(message.roomId);
    const digest = this.digestsByRoom.get(room) ?? [];
    digest.push(`${speaker}: ${excerpt}`);
    if (digest.length > CONVERSATION_DIGEST.MAX_ENTRIES) {
      digest.shift();
    }
    this.digestsByRoom.set(room, digest);
  }

  /**
   * Rolling summary of messages that scrolled out of the context window,
   * oldest first. Empty string until the window has overflowed.
   * Scoped to a room when one is given.
   */
  getConversationDigest(roomId?: string): string {
    if (roomId === undefined) {
      return Array.from(this.digestsByRoom.values()).flat().join("\n");
    }
    return (this.digestsByRoom.get(normalizeRoomId(roomId)) ?? []).join("\n");
  }

  /** Messages belonging to one room, oldest first. */
  private messagesForRoom(roomId: string): ContextMessage[] {
    const room = normalizeRoomId(roomId);
    return this.messages.filter(
      (message) => normalizeRoomId(message.roomId) === room,
    );
  }

  /**
   * Get context for AI (recent messages). Omitting roomId returns messages
   * from every room, which is what the single-room CLI wants.
   */
  getContext(limit?: number, roomId?: string): ContextMessage[] {
    const actualLimit = limit ?? 50;
    const pool =
      roomId === undefined ? this.messages : this.messagesForRoom(roomId);
    return pool.slice(-actualLimit);
  }

  /**
   * Get context for AI (recent messages) - alias for compatibility
   */
  getContextForAI(limit = 50, roomId?: string): ContextMessage[] {
    return this.getContext(limit, roomId);
  }

  /**
   * Get all messages in context
   */
  getAllMessages(): ContextMessage[] {
    return [...this.messages];
  }

  /**
   * Clear the context
   */
  clear(): void {
    this.messages = [];
    this.digestsByRoom.clear();
  }

  /**
   * Get the number of messages in context
   */
  size(): number {
    return this.messages.length;
  }

  /**
   * Check if context has any messages
   */
  hasMessages(): boolean {
    return this.messages.length > 0;
  }

  /**
   * Get the last message
   */
  getLastMessage(roomId?: string): ContextMessage | null {
    const pool =
      roomId === undefined ? this.messages : this.messagesForRoom(roomId);
    return pool.length > 0 ? pool[pool.length - 1] : null;
  }

  /**
   * Get messages from a specific sender
   */
  getMessagesBySender(sender: string): ContextMessage[] {
    return this.messages.filter((msg) => msg.sender === sender);
  }

  /**
   * Get messages by role
   */
  getMessagesByRole(role: "user" | "assistant"): ContextMessage[] {
    return this.messages.filter((msg) => msg.role === role);
  }

  /**
   * Get recent context window
   */
  getRecentContext(windowSize = 10): ContextMessage[] {
    return this.messages.slice(-windowSize);
  }

  /**
   * Update context configuration
   */
  updateConfig(config: Partial<ContextManagerConfig>): void {
    this.config = { ...this.config, ...config };

    // If max messages was reduced, trim the array
    if (config.maxMessages && this.messages.length > config.maxMessages) {
      this.messages = this.messages.slice(-config.maxMessages);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ContextManagerConfig {
    return { ...this.config };
  }

  /**
   * Get context metrics
   */
  getMetrics(): Record<string, unknown> {
    const userMessages = this.getMessagesByRole("user");
    const assistantMessages = this.getMessagesByRole("assistant");

    return {
      totalMessages: this.messages.length,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      maxMessages: this.config.maxMessages,
      utilizationPercent:
        (this.messages.length / this.config.maxMessages) * 100,
      oldestMessageAge:
        this.messages.length > 0
          ? Date.now() - (this.messages[0].timestamp ?? Date.now())
          : null,
      newestMessageAge:
        this.messages.length > 0
          ? Date.now() -
            (this.messages[this.messages.length - 1].timestamp ?? Date.now())
          : null,
    };
  }

  /**
   * Find messages containing mentions
   */
  getMessagesWithMentions(): ContextMessage[] {
    return this.messages.filter(
      (msg) => msg.mentions && msg.mentions.length > 0,
    );
  }

  /**
   * Get context summary for prompts
   */
  getContextSummary(): string {
    if (this.messages.length === 0) {
      return "No conversation history.";
    }

    const recentMessages = this.getRecentContext(5);
    const summary = recentMessages
      .map((msg) => {
        const role =
          msg.role === "user" ? "User" : msg.displayName || "Assistant";
        return `${role}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? "..." : ""}`;
      })
      .join("\n");

    return `Recent conversation:\n${summary}`;
  }
}
