/**
 * PromptLog - the prompt behind each AI's latest posted reply, per room, so
 * /debug can show what a model was actually sent. Memory only and bounded
 * (PROMPT_LOG.MAX_RECORDS, oldest dropped first): a restart forgets it.
 */

import { normalizeRoomId } from "@ai-chat/ai-configs";
import type { Message } from "@/types/index.js";
import { PROMPT_LOG } from "./constants.js";

export type PromptRecord = {
  roomId: string;
  aiId: string;
  aiName: string;
  modelId?: string;
  /** The reply as posted, after cleanup */
  reply: string;
  /** System prompt and labelled transcript, as passed to the AI service */
  messages: Message[];
  createdAt: number;
};

const recordKey = (roomId: string, aiId: string): string =>
  `${normalizeRoomId(roomId)}\n${aiId}`;

export class PromptLog {
  private records = new Map<string, PromptRecord>();

  constructor(private readonly maxRecords: number = PROMPT_LOG.MAX_RECORDS) {}

  record(record: PromptRecord): void {
    const key = recordKey(record.roomId, record.aiId);
    // Re-inserting moves the key to the end, so Map order is recency
    this.records.delete(key);
    this.records.set(key, record);
    if (this.records.size > this.maxRecords) {
      const [oldestKey] = this.records.keys();
      this.records.delete(oldestKey);
    }
  }

  get(roomId: string, aiId: string): PromptRecord | undefined {
    return this.records.get(recordKey(roomId, aiId));
  }

  clearRoom(roomId: string): void {
    const room = normalizeRoomId(roomId);
    for (const [key, record] of this.records) {
      if (normalizeRoomId(record.roomId) === room) this.records.delete(key);
    }
  }

  clear(): void {
    this.records.clear();
  }
}
