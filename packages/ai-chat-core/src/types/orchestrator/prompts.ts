/**
 * System prompt construction types.
 */

import type { AIParticipant } from "./participants.js";
import type { InteractionStrategy } from "./strategy.js";

export interface PromptContext {
  strategy: InteractionStrategy;
  recentContext: string;
  participantCount: number;
  conversationTopic?: string;
  userIntent?: string;
  emotionalTone?: string;
}

export interface PromptTemplate {
  base: string;
  strategySpecific: Record<InteractionStrategy, string>;
  contextEnhancements: {
    topicChange: string;
    comment: string;
    agreement: string;
    challenge: string;
  };
}

export interface SystemPromptBuilderConfig {
  templates: PromptTemplate;
  maxContextLength: number;
  includeParticipantInfo: boolean;
  includeStrategyHints: boolean;
}

export interface ISystemPromptBuilder {
  buildPrompt(
    basePrompt: string,
    context: PromptContext,
    participant: AIParticipant,
  ): string;

  enhanceContextForStrategy(
    context: string,
    strategy: InteractionStrategy,
  ): string;

  enhanceContextForTopicChange(
    context: string,
    newTopic: string,
    previousTopic?: string,
  ): string;

  enhanceContextForComment(context: string, comment: string): string;

  truncateResponse(response: string, maxLength: number): string;
}
