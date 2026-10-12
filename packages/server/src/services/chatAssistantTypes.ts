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
  toolCalls?: string[];
  error?: Error | null;
};

export type ErrorWithCode = Error & { code?: string };

export type LocalCodeMcpServer = {
  model: string;
  answerQuestion: (
    question: string,
    options: { chatHistory?: ChatHistoryEntry[]; askedBy?: string },
  ) => Promise<MCPAnswer>;
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
  /** Display name of whoever mentioned @Chat */
  askedBy?: string;
};
