/**
 * CLI Type Definitions
 */

import type { AIModel, AIProvider, AIServiceConfig, Message } from "@ai-chat/core";

export interface ParticipantConfig {
  provider: string;
  model: string | null;
}

export type ResolvedParticipantConfig = AIServiceConfig & {
  provider: AIProvider;
  model: AIModel;
};

export interface ConversationHistoryEntry {
  from: string;
  content: string;
  timestamp: string;
  role?: "user" | "assistant" | "system";
}

export interface ParticipantMetadata {
  providerKey: string | null;
  providerAlias: string | null;
  providerName: string;
  modelKey: string | null;
  modelId: string;
}

export interface ParsedArgs {
  participants: ParticipantConfig[];
  topic: string;
  maxTurns: number;
  singlePromptMode: boolean;
  command: string;
  conversationFile?: string;
  additionalTurns?: number;
}

export interface ConversationOptions {
  participants: ParticipantConfig[];
  topic: string;
  maxTurns: number;
  singlePromptMode?: boolean;
  existingResponses?: ConversationHistoryEntry[];
  initialConversation?: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
  metadata?: Record<string, unknown>;
}

export interface ContinueOptions {
  conversationFile: string;
  participants: ParticipantConfig[];
  additionalTurns: number;
}

/**
 * Convert conversation history entries to Message format for core functions
 */
export const toMessages = (entries: ConversationHistoryEntry[]): Message[] =>
  entries.map((entry) => {
    const role: Message["role"] =
      entry.role || (entry.from === "User" ? "user" : "assistant");
    return { role, content: entry.content };
  });
