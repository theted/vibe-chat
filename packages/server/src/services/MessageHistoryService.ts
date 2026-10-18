/**
 * Handles message persistence and retrieval from Redis
 */

import type { ChatOrchestrator } from "@ai-chat/core";
import type { ChatMessage } from "@/types.js";
import type { RedisClient } from "./RedisClient.js";

type MessageHistoryOptions = {
  redisClient: RedisClient | null;
  recentMessageLimit?: number;
  messageTtlSeconds?: number;
};

const DEFAULT_RECENT_MESSAGE_LIMIT = 20;
const DEFAULT_MESSAGE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Service for storing and retrieving chat message history from Redis
 */
export class MessageHistoryService {
  private redisClient: RedisClient | null;
  private recentMessageLimit: number;
  private messageTtlSeconds: number;

  constructor(options: MessageHistoryOptions) {
    this.redisClient = options.redisClient;
    this.recentMessageLimit =
      options.recentMessageLimit ?? DEFAULT_RECENT_MESSAGE_LIMIT;
    this.messageTtlSeconds =
      options.messageTtlSeconds ?? DEFAULT_MESSAGE_TTL_SECONDS;
  }

  /**
   * Generate Redis key for room messages
   */
  getRoomMessageKey(roomId = "default"): string {
    return `ai-chat:rooms:${roomId}:messages`;
  }

  /**
   * Store a message in Redis history
   */
  async storeMessage(roomId = "default", message: ChatMessage): Promise<void> {
    if (!this.redisClient) return;

    const key = this.getRoomMessageKey(roomId);
    const storedMessage = {
      ...message,
      roomId,
      timestamp: message.timestamp || Date.now(),
      storedAt: Date.now(),
    };

    try {
      await this.redisClient
        .multi()
        .lPush(key, JSON.stringify(storedMessage))
        .lTrim(key, 0, this.recentMessageLimit - 1)
        .expire(key, this.messageTtlSeconds)
        .exec();
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : String(error);
      console.warn("Failed to store message in Redis:", messageText);
    }
  }

  /**
   * Get recent messages from Redis or fallback to orchestrator context
   */
  async getRecentMessages(
    roomId = "default",
    contextManager?: ChatOrchestrator["contextManager"],
  ): Promise<ChatMessage[]> {
    if (!this.redisClient) {
      // Fallback to in-memory context
      if (!contextManager) {
        return [];
      }
      return contextManager
        .getContextForAI(this.recentMessageLimit, roomId)
        .map((ctx) => ({
          id:
            ctx.id ||
            `ctx-${ctx.timestamp || Date.now()}-${Math.random().toString(16).slice(2)}`,
          sender: ctx.sender || "unknown",
          displayName: ctx.displayName || ctx.sender || "unknown",
          alias: ctx.alias || ctx.sender || "unknown",
          normalizedAlias: ctx.normalizedAlias,
          content: ctx.content,
          senderType: ctx.senderType || "user",
          timestamp: ctx.timestamp || Date.now(),
          roomId,
        })) as ChatMessage[];
    }

    const key = this.getRoomMessageKey(roomId);
    try {
      const entries = await this.redisClient.lRange(
        key,
        0,
        this.recentMessageLimit - 1,
      );
      const parsedEntries = entries
        .map((entry) => {
          try {
            const parsed = JSON.parse(entry) as ChatMessage;
            return {
              ...parsed,
              timestamp: parsed.timestamp || parsed.storedAt || Date.now(),
              roomId: parsed.roomId || roomId,
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean) as ChatMessage[];
      return parsedEntries.reverse();
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : String(error);
      console.warn("Failed to load recent messages from Redis:", messageText);
      return [];
    }
  }

  /**
   * Seed an empty room's history with another room's, retagged with the new
   * room - a private chat that gains or loses a model moves to a new room id,
   * and the transcript should come along. A room that already has history
   * keeps it. Returns how many messages were copied.
   */
  async copyRoomHistory(fromRoomId: string, toRoomId: string): Promise<number> {
    if (!this.redisClient || fromRoomId === toRoomId) return 0;

    const fromKey = this.getRoomMessageKey(fromRoomId);
    const toKey = this.getRoomMessageKey(toRoomId);
    try {
      const existing = await this.redisClient.lRange(toKey, 0, 0);
      if (existing.length > 0) return 0;

      // Newest first, as storeMessage pushes them
      const entries = await this.redisClient.lRange(
        fromKey,
        0,
        this.recentMessageLimit - 1,
      );
      const retagged = entries.flatMap((entry) => {
        try {
          const message = JSON.parse(entry) as ChatMessage;
          return [JSON.stringify({ ...message, roomId: toRoomId })];
        } catch {
          return [];
        }
      });
      if (retagged.length === 0) return 0;

      // Push oldest first so the newest message ends up at the head again
      const transaction = this.redisClient.multi();
      [...retagged]
        .reverse()
        .forEach((entry) => transaction.lPush(toKey, entry));
      await transaction
        .lTrim(toKey, 0, this.recentMessageLimit - 1)
        .expire(toKey, this.messageTtlSeconds)
        .exec();
      return retagged.length;
    } catch (error) {
      const messageText =
        error instanceof Error ? error.message : String(error);
      console.warn(
        `Failed to copy message history from ${fromRoomId} to ${toRoomId}:`,
        messageText,
      );
      return 0;
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.redisClient !== null;
  }
}
