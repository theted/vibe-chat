/**
 * AI participant status in a chat session
 */
export type AiParticipantStatus = "active" | "inactive";

/**
 * Conversational temperament for a participant. Both values are multipliers
 * around 1: `tempo` scales response delays (lower = replies faster) and
 * `chattiness` weights how often the AI is picked to respond (higher = more
 * talkative). Omitted values get a stable per-AI default derived from the id.
 */
export type AiTraits = {
  tempo?: number;
  chattiness?: number;
};

/**
 * AI participant configuration
 */
export type AiParticipant = {
  id: string;
  name: string;
  alias: string;
  provider: string;
  status: AiParticipantStatus;
  emoji: string;
  traits?: AiTraits;
};

/**
 * Display metadata for AI models
 */
export type AiDisplayInfo = {
  displayName: string;
  alias: string;
  emoji: string;
  traits?: AiTraits;
};

/**
 * Map of model IDs to display info
 */
export type AiDisplayInfoMap = Record<string, AiDisplayInfo>;
