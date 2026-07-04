import type { Server } from "socket.io";

import type { ChatMessage } from "@/types.js";
import type { VectorContext } from "@/utils/formatUtils.js";

export type ChatAssistantOptions = {
  mentionName?: string;
  projectRoot?: string;
  timeoutMs?: number;
};

export type ChatHistoryEntry = {
  sender: string;
  senderType: string;
  content: string;
};

export type MCPAnswer = {
  answer?: string;
  contexts?: VectorContext[];
  error?: Error | null;
};

export type ErrorWithCode = Error & { code?: string };

export type LocalCodeMcpServer = {
  ensureCollection: () => Promise<boolean>;
  answerQuestion: (
    question: string,
    options: { chatHistory?: ChatHistoryEntry[] },
  ) => Promise<MCPAnswer>;
};

export type WorkspaceIndexer = {
  buildEmbeddingStore: () => Promise<{
    chunks: number;
    collectionName: string;
    chromaUrl: string;
  }>;
};

export type ChatAssistantResponse = {
  question: string;
  answer: string;
  contexts?: VectorContext[];
  error?: Error | null;
};

export type ChatAssistantResponseOptions = {
  emitter?: Server | null;
  roomId?: string | null;
  chatHistory?: ChatMessage[];
};
