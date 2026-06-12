/**
 * Context manager types: the rolling message window fed to AIs.
 */

import { Message } from "../index.js";

export interface ContextMessage extends Message {
  importance?: number;
  tokens?: number;
  sender?: string;
  senderType?: "user" | "ai" | "system";
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
  addMessage(message: Message): void;
  getContext(maxMessages?: number): ContextMessage[];
  clear(): void;
  updateConfig(config: Partial<ContextManagerConfig>): void;
  getConfig(): ContextManagerConfig;
  size(): number;
  hasMessages(): boolean;
}
