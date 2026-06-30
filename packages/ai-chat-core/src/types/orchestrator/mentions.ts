/**
 * Mention detection types.
 */

import { Message } from "../index.js";
import type { AIParticipant } from "./participants.js";

export interface MentionData {
  type: "direct" | "indirect" | "context";
  targetAI?: AIParticipant;
  originalText: string;
  normalizedTarget: string;
  confidence: number;
}

export interface MentionContext {
  message: Message;
  mentions: MentionData[];
  explicitTargets: AIParticipant[];
  implicitTargets: AIParticipant[];
}

export const isMentionData = (obj: unknown): obj is MentionData => {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "type" in obj &&
    "originalText" in obj &&
    typeof (obj as MentionData).originalText === "string"
  );
};
