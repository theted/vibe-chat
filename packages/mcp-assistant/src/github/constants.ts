/**
 * Limits for @Chat filing GitHub issues. The chat is public and AIs can ask
 * @Chat to file on their behalf, so the caps live in code, not the prompt.
 */

const HOUR_MS = 60 * 60 * 1000;

export const GITHUB_API_URL = "https://api.github.com";
export const GITHUB_API_VERSION = "2022-11-28";
export const GITHUB_REQUEST_TIMEOUT_MS = 15_000;
export const DEFAULT_ISSUES_REPO = "theted/vibe-chat";

export const ISSUES_TOKEN_ENV = "GITHUB_ISSUES_TOKEN";
export const ISSUES_REPO_ENV = "GITHUB_ISSUES_REPO";

// Across all rooms; a burst of AI enthusiasm shouldn't flood the tracker
export const ISSUE_CREATE_LIMITS = [
  { windowMs: HOUR_MS, maxIssues: 3 },
  { windowMs: 24 * HOUR_MS, maxIssues: 10 },
] as const;
// One question to @Chat files at most one issue
export const MAX_ISSUES_PER_QUESTION = 1;

export const ISSUE_SEARCH_RESULTS = 5;

// Every issue gets these; the kind adds bug/enhancement
export const FROM_CHAT_LABEL = "from-chat";
export const ISSUE_KIND_LABELS = {
  feature: "enhancement",
  bug: "bug",
} as const;

// How much chat goes into the issue, and how much of each message
export const ISSUE_TRANSCRIPT_MESSAGES = 12;
export const ISSUE_TRANSCRIPT_MESSAGE_CHARS = 600;
export const ISSUE_TITLE_MAX_CHARS = 100;
export const ISSUE_FIELD_MAX_CHARS = 2_000;
export const ISSUE_MAX_CRITERIA = 8;

// Hidden marker so a triage workflow can find chat-filed issues and their
// origin without parsing prose
export const ISSUE_METADATA_MARKER = "vibe-chat:from-chat";
