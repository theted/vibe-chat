import type { IssueRequestContext } from "@ai-chat/mcp-assistant";
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
  issuesFiled?: { number: number; url: string }[];
  error?: Error | null;
};

export type ErrorWithCode = Error & { code?: string };

export type LocalCodeMcpServer = {
  model: string;
  /** Repo @Chat files issues in; null without a GitHub token */
  issuesRepo: string | null;
  answerQuestion: (
    question: string,
    options: {
      chatHistory?: ChatHistoryEntry[];
      askedBy?: string;
      issueContext?: IssueRequestContext;
    },
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
  /** Room, asker kind and transcript, for issues @Chat may file */
  issueContext?: IssueRequestContext;
};
