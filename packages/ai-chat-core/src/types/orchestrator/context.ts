/**
 * Context manager types: the rolling message window fed to AIs.
 */

import type { ChatMessageBase } from "@ai-chat/ai-configs";
import { Message } from "../index.js";

/**
 * A room chat message inside the orchestrator. Extends the shared wire shape
 * (ChatMessageBase) so server/client messages flow in without casts;
 * sender/senderType are optional here because internal prompt-instruction
 * messages don't carry them.
 */
export interface ContextMessage
  extends Omit<ChatMessageBase, "sender" | "senderType"> {
  sender?: ChatMessageBase["sender"];
  senderType?: ChatMessageBase["senderType"];
  /** LLM prompt role - ContextManager derives it from senderType on add. */
  role?: Message["role"];
  // Orchestration / routing
  roomId?: string;
  priority?: number;
  suppressAIResponses?: boolean;
  normalizedAlias?: string;
  /** Strategy that produced this AI message (diagnostics only). */
  responseType?: string;
  interactionStrategy?: string;
  // Context-window bookkeeping
  importance?: number;
  tokens?: number;
  mentions?: string[];
  mentionsNormalized?: string[];
  isInternal?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ContextManagerConfig {
  maxMessages: number;
  maxTokens?: number;
  prioritizeRecent?: boolean;
  includeSystemMessages?: boolean;
  includeMetadata?: boolean;
  preserveMentions?: boolean;
}

export interface IContextManager {
  addMessage(message: ContextMessage): void;
  getContext(maxMessages?: number): ContextMessage[];
  clear(): void;
  updateConfig(config: Partial<ContextManagerConfig>): void;
  getConfig(): ContextManagerConfig;
  size(): number;
  hasMessages(): boolean;
}
