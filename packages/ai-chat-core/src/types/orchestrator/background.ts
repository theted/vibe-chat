/**
 * Background conversation types: AI-to-AI chatter during user silence.
 */

import type { AIParticipant } from "./participants.js";

export interface BackgroundConversationConfig {
  enabled: boolean;
  triggerSilenceMs: number;
  participantRotationMs: number;
  maxBackgroundMessages: number;
  sleepAfterMessages: number;
  wakeUpProbability: number;
}

export interface BackgroundConversationState {
  isActive: boolean;
  lastTriggerTime?: number;
  sleepingParticipants: Set<string>;
  activeTimer?: NodeJS.Timeout;
  messagesSinceUserInput: number;
}

export interface IBackgroundConversationManager {
  start(participants: AIParticipant[]): void;
  stop(): void;
  handleSilence(silenceDurationMs: number): void;
  putParticipantsToSleep(participants: AIParticipant[]): void;
  wakeUpParticipants(participants?: AIParticipant[]): void;
  shouldTriggerBackground(silenceDurationMs: number): boolean;
  getState(): BackgroundConversationState;
}
