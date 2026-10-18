import path from "path";
import Anthropic from "@anthropic-ai/sdk";

import {
  AGENT_MODEL_ENV,
  DEFAULT_AGENT_MODEL,
  runChatAgent,
} from "./agent/chatAgent.js";
import type { HistoryLine } from "./agent/prompts.js";
import { CodebaseSearch, type CodeSnippet } from "./codeSearch.js";
import {
  DEFAULT_CHROMA_URL,
  DEFAULT_COLLECTION_NAME,
  EMBEDDING_STORE_MISSING_CODE,
  VECTOR_STORE_UNAVAILABLE_CODE,
} from "./constants.js";
import type { ErrorWithCode } from "./chroma.js";
import { createEmbedder } from "./embeddings.js";
import {
  DEFAULT_ISSUES_REPO,
  ISSUES_REPO_ENV,
  ISSUES_TOKEN_ENV,
} from "./github/constants.js";
import {
  type CreatedIssue,
  GitHubIssuesClient,
} from "./github/githubIssues.js";
import { IssueLimiter } from "./github/issueLimiter.js";
import type { IssueToolContext } from "./tools/issueTools.js";

const CHAT_HISTORY_LIMIT = 5;
// Per API request, not per question: one question can take several rounds
const ANTHROPIC_REQUEST_TIMEOUT_MS = 120_000;

export type ChatAssistantEngineOptions = {
  rootDir?: string;
  chromaUrl?: string;
  collectionName?: string;
  model?: string;
  anthropicApiKey?: string;
  /** Fine-grained token with Issues read/write on `issuesRepo`; no token, no issue tools */
  githubIssuesToken?: string;
  issuesRepo?: string;
};

type ChatHistoryMessage = {
  sender?: string;
  displayName?: string;
  alias?: string;
  normalizedAlias?: string;
  senderType?: string;
  content?: string;
};

/** Where a question came from, for the issue tools. Supplied by the server. */
export type IssueRequestContext = {
  roomId: string;
  /** False in private rooms: their conversation mustn't end up in a public issue */
  canFileIssues: boolean;
  requesterType: "human" | "ai";
  /** The room's latest messages, quoted in any issue filed */
  transcript: ChatHistoryMessage[];
};

type AnswerQuestionOptions = {
  chatHistory?: ChatHistoryMessage[];
  /** Display name of whoever mentioned @Chat */
  askedBy?: string;
  issueContext?: IssueRequestContext;
};

type AnswerContext = {
  id: number;
  relativePath: string;
  startLine: number | null;
  endLine: number | null;
  content: string;
  score: number | null;
};

type AnswerResult = {
  answer: string;
  contexts: AnswerContext[];
  toolCalls: string[];
  issuesFiled: CreatedIssue[];
};

const toHistoryLines = (chatHistory: ChatHistoryMessage[]): HistoryLine[] =>
  chatHistory.flatMap((message) => {
    const content = message?.content?.trim();
    if (!content) return [];
    const sender =
      message.displayName ||
      message.sender ||
      message.alias ||
      message.normalizedAlias ||
      "participant";
    return [{ sender, senderType: message.senderType || "user", content }];
  });

const normalizeHistory = (chatHistory: ChatHistoryMessage[]): HistoryLine[] =>
  toHistoryLines(chatHistory).slice(-CHAT_HISTORY_LIMIT);

/**
 * The room must get the link to anything filed, even if the model's answer
 * forgot it or came back empty.
 */
export const ensureIssueLinks = (
  answer: string,
  issues: CreatedIssue[],
): string => {
  const missing = issues.filter(({ url }) => !answer.includes(url));
  if (missing.length === 0) return answer;
  const links = missing.map(({ number, url }) => `Filed #${number}: ${url}`);
  return [answer, ...links].filter(Boolean).join("\n");
};

/**
 * Keeps only the files the answer actually names, one entry per file, so the
 * Sources list reflects what the answer relied on - not every chunk the agent
 * happened to retrieve along the way. The model sometimes drops the directory
 * (`ResponseScheduler.ts`), so a backticked basename counts too.
 */
const selectCitedSources = (
  answer: string,
  snippets: CodeSnippet[],
): AnswerContext[] => {
  const seen = new Set<string>();
  const isCited = ({ relativePath }: CodeSnippet) =>
    answer.includes(relativePath) ||
    answer.includes(`\`${path.basename(relativePath)}\``);
  return snippets
    .filter((snippet) => {
      if (seen.has(snippet.relativePath) || !isCited(snippet)) return false;
      seen.add(snippet.relativePath);
      return true;
    })
    .map((snippet, index) => ({
      id: index + 1,
      relativePath: snippet.relativePath,
      startLine: snippet.startLine,
      endLine: snippet.endLine,
      content: snippet.content,
      score: snippet.distance,
    }));
};

/**
 * Backs the @Chat participant: a Claude agent that can search this repo's
 * Chroma index, search the web and browse pages.
 */
export class ChatAssistantEngine {
  rootDir: string;
  chromaUrl: string;
  collectionName: string;
  model: string;
  codebase: CodebaseSearch;
  client: Anthropic;
  issues: Pick<IssueToolContext, "client" | "limiter"> | null;

  constructor(options: ChatAssistantEngineOptions = {}) {
    const {
      rootDir = process.cwd(),
      chromaUrl = process.env.CHROMA_URL || DEFAULT_CHROMA_URL,
      collectionName = process.env.CHAT_ASSISTANT_COLLECTION ||
        DEFAULT_COLLECTION_NAME,
      model = process.env[AGENT_MODEL_ENV] || DEFAULT_AGENT_MODEL,
      anthropicApiKey = process.env.ANTHROPIC_API_KEY,
      githubIssuesToken = process.env[ISSUES_TOKEN_ENV],
      issuesRepo = process.env[ISSUES_REPO_ENV] || DEFAULT_ISSUES_REPO,
    } = options;

    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY is required for the @Chat assistant.");
    }

    this.rootDir = path.resolve(rootDir);
    this.chromaUrl = chromaUrl;
    this.collectionName = collectionName;
    this.model = model;
    this.codebase = new CodebaseSearch({
      chromaUrl,
      collectionName,
      embedder: createEmbedder(),
    });
    this.client = new Anthropic({
      apiKey: anthropicApiKey,
      timeout: ANTHROPIC_REQUEST_TIMEOUT_MS,
    });
    this.issues = githubIssuesToken
      ? {
          client: new GitHubIssuesClient(githubIssuesToken, issuesRepo),
          limiter: new IssueLimiter(),
        }
      : null;
  }

  /** Repo @Chat can file issues in, or null when no token is configured. */
  get issuesRepo(): string | null {
    return this.issues?.client.repo ?? null;
  }

  private buildIssueTools(
    askedBy: string | undefined,
    issueContext: IssueRequestContext | undefined,
  ): IssueToolContext | undefined {
    if (!this.issues) return undefined;
    const origin =
      issueContext?.canFileIssues && askedBy
        ? {
            requestedBy: askedBy,
            requesterType: issueContext.requesterType,
            roomId: issueContext.roomId,
            transcript: toHistoryLines(issueContext.transcript),
            model: this.model,
          }
        : null;
    return { ...this.issues, origin, filed: [] };
  }

  /** True if the index exists; throws E_VECTOR_STORE_UNAVAILABLE when Chroma is down. */
  async ensureCollection(): Promise<boolean> {
    return this.codebase.hasIndex();
  }

  async ensureEmbeddingStore(): Promise<boolean> {
    if (await this.ensureCollection()) return true;
    const error: ErrorWithCode = new Error(
      `Embedding store "${this.collectionName}" not found at ${this.chromaUrl}. Run the indexing script first.`,
    );
    error.code = EMBEDDING_STORE_MISSING_CODE;
    throw error;
  }

  async answerQuestion(
    question: string,
    { chatHistory = [], askedBy, issueContext }: AnswerQuestionOptions = {},
  ): Promise<AnswerResult> {
    const { answer, snippets, toolCalls, issuesFiled } = await runChatAgent(
      {
        question: question.trim(),
        askedBy,
        history: normalizeHistory(chatHistory),
      },
      {
        client: this.client,
        model: this.model,
        tools: {
          codebase: this.codebase,
          issues: this.buildIssueTools(askedBy, issueContext),
        },
      },
    );
    return {
      answer: ensureIssueLinks(answer, issuesFiled),
      contexts: selectCitedSources(answer, snippets),
      toolCalls,
      issuesFiled,
    };
  }
}

/**
 * Create the @Chat assistant engine. (Name kept from the original
 * local-code server so existing callers don't change.)
 */
export const createLocalCodeMcpServer = (
  options: ChatAssistantEngineOptions = {},
): ChatAssistantEngine => new ChatAssistantEngine(options);

export const MCP_ERROR_CODES = {
  VECTOR_STORE_UNAVAILABLE: VECTOR_STORE_UNAVAILABLE_CODE,
  EMBEDDING_STORE_MISSING: EMBEDDING_STORE_MISSING_CODE,
} as const;

export { DEFAULT_CHROMA_URL, DEFAULT_COLLECTION_NAME } from "./constants.js";
export { resolveEmbeddingProvider } from "./embeddings.js";
export { findWorkspaceRoot } from "./workspaceRoot.js";
