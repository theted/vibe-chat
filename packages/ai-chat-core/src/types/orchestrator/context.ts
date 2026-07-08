/**
 * Context manager types: the rolling message window fed to AIs.
 */

import { Message } from "../index.js";

export interface ContextMessage extends Omit<Message, "role"> {
  /** Optional on input - ContextManager derives it from senderType on add. */
  role?: Message["role"];
  importance?: number;
  tokens?: number;
  sender?: string;
  // "assistant" is a legacy wire value (@Chat) - treated as a non-user sender
  senderType?: "user" | "ai" | "system" | "assistant";
  displayName?: string;
  alias?: string;
  normalizedAlias?: string;
  aiId?: string;
  providerKey?: string;
  modelKey?: string;
  mentions?: string[];
  mentionsNormalized?: string[];
  isInternal?: boolean;
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
