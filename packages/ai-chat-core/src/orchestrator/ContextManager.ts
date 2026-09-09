/**
 * Context Manager - Handles conversation context with sliding window
 */

import {
  IContextManager,
  ContextMessage,
  ContextManagerConfig,
} from "@/types/orchestrator.js";
import { CONVERSATION_DIGEST } from "./constants.js";
import { excerptForQuote } from "@/utils/orchestrator/responseUtils.js";
import { normalizeAlias, parseMentions } from "@/utils/stringUtils.js";

export class ContextManager implements IContextManager {
  private messages: ContextMessage[] = [];
  private config: ContextManagerConfig;
  /** One-liners of messages evicted from the window - see getConversationDigest. */
  private digest: string[] = [];

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

    if (this.messages.length >= this.config.maxMessages) {
      const evicted = this.messages.shift();
      if (evicted) this.addToDigest(evicted);
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

    this.digest.push(`${speaker}: ${excerpt}`);
    if (this.digest.length > CONVERSATION_DIGEST.MAX_ENTRIES) {
      this.digest.shift();
    }
  }

  /**
   * Rolling summary of messages that scrolled out of the context window,
   * oldest first. Empty string until the window has overflowed.
   */
  getConversationDigest(): string {
    return this.digest.join("\n");
  }

  /**
   * Get context for AI (recent messages)
   */
  getContext(limit?: number): ContextMessage[] {
    const actualLimit = limit ?? 50;
    return this.messages.slice(-actualLimit);
  }

  /**
   * Get context for AI (recent messages) - alias for compatibility
   */
  getContextForAI(limit = 50): ContextMessage[] {
    return this.getContext(limit);
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
    this.digest = [];
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
  getLastMessage(): ContextMessage | null {
    return this.messages.length > 0
      ? this.messages[this.messages.length - 1]
      : null;
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
