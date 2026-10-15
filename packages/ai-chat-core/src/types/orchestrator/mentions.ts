/**
 * Mention detection types.
 */

import type { AIParticipant } from "./participants.js";

export interface MentionData {
  type: "direct" | "indirect" | "context";
  targetAI?: AIParticipant;
  originalText: string;
  normalizedTarget: string;
  confidence: number;
}
