/**
 * AI participant status in a chat session
 */
export type AiParticipantStatus = "active" | "inactive";

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
};

/**
 * Display metadata for AI models
 */
export type AiDisplayInfo = {
  displayName: string;
  alias: string;
  emoji: string;
};

/**
 * Map of model IDs to display info
 */
export type AiDisplayInfoMap = Record<string, AiDisplayInfo>;
