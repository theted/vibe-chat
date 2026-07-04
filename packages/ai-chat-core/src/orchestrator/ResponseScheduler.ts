/**
 * ResponseScheduler - Decides which AIs respond to the latest message and
 * when, then enqueues the resulting batch on the response queue.
 *
 * Mentioned AIs always respond; the rest are filled in randomly up to a
 * count derived from the eligible pool. Per-responder delays come from
 * calculateResponseDelay.
 */

import type { AIRegistry } from "./AIRegistry.js";
import type { ContextMessage } from "@/types/orchestrator.js";
import type { QueuedResponse } from "./ResponseQueue.js";
import { FADE_OUT, REOPENING, RESPONDER_CONFIG } from "./constants.js";
import {
  calculateResponseDelay,
  sampleConversationalDelay,
  selectRespondingAIs,
} from "@/utils/orchestrator/responseScheduling.js";

export type ResponseDelays = {
  minUserResponseDelay: number;
  maxUserResponseDelay: number;
  minBackgroundDelay: number;
  maxBackgroundDelay: number;
  minDelayBetweenAI: number;
  maxDelayBetweenAI: number;
};

type ResponseSchedulerDeps = {
  registry: AIRegistry;
  getLastMessage: () => ContextMessage | undefined;
  filterAIsForRoom: (roomId: string, aiIds: string[]) => string[];
  enqueueBatch: (responses: QueuedResponse[]) => void;
  isAsleep: () => boolean;
  /** How close the AI-message budget is to running out, 0..1. */
  getFatigue: () => number;
  getDelays: () => ResponseDelays;
};

export type ScheduleOptions = {
  /** Single AI reopening a quiet room - see REOPENING constants. */
  isReopening?: boolean;
};

export class ResponseScheduler {
  constructor(private readonly deps: ResponseSchedulerDeps) {}

  schedule(
    roomId: string,
    isUserResponse = true,
    scheduleOptions: ScheduleOptions = {},
  ): void {
    const { registry, isAsleep, filterAIsForRoom } = this.deps;
    const aiServices = registry.services;
    const activeAIs = registry.activeIds;

    const roomScopedAIs = filterAIsForRoom(roomId, activeAIs);

    if (isAsleep() || roomScopedAIs.length === 0) return;

    // Fade-out: as the AI-message budget depletes, background rounds get
    // skipped more often so the conversation trails off instead of stopping
    const fatigue = this.deps.getFatigue();
    const fadeProgress =
      fatigue <= FADE_OUT.START_RATIO
        ? 0
        : Math.min(
            (fatigue - FADE_OUT.START_RATIO) / (1 - FADE_OUT.START_RATIO),
            1,
          );
    if (!isUserResponse && fadeProgress > 0) {
      const responseProbability =
        1 - fadeProgress * (1 - FADE_OUT.MIN_RESPONSE_PROBABILITY);
      if (Math.random() > responseProbability) return;
    }

    const typingAICount = roomScopedAIs.filter((aiId) => {
      const ai = aiServices.get(aiId);
      return ai?.isGenerating;
    }).length;

    const eligibleAIs = roomScopedAIs.filter((aiId) => {
      const ai = aiServices.get(aiId);
      return (
        ai?.isActive && !ai.isGenerating && (isUserResponse || !ai.justResponded)
      );
    });

    if (eligibleAIs.length === 0) return;

    if (scheduleOptions.isReopening) {
      this.scheduleReopening(roomId, eligibleAIs);
      return;
    }

    const activeCount = eligibleAIs.length;
    const baseMaxResponders = isUserResponse
      ? Math.max(
          RESPONDER_CONFIG.USER_RESPONSE_MIN_COUNT,
          Math.ceil(activeCount * RESPONDER_CONFIG.USER_RESPONSE_MAX_MULTIPLIER),
        )
      : Math.max(
          RESPONDER_CONFIG.BACKGROUND_MIN_COUNT,
          Math.ceil(activeCount * RESPONDER_CONFIG.BACKGROUND_MAX_MULTIPLIER),
        );
    const baseMinResponders = isUserResponse
      ? RESPONDER_CONFIG.USER_RESPONSE_MIN_BASE
      : RESPONDER_CONFIG.BACKGROUND_MIN_BASE;

    const lastMessage = this.deps.getLastMessage();
    const mentionTargets = new Set(lastMessage?.mentionsNormalized || []);

    const mentionedAIs = eligibleAIs
      .map((aiId) => aiServices.get(aiId))
      .filter((ai) => ai && mentionTargets.has(ai.normalizedAlias))
      .map((ai) => ai.id);

    const uniqueMentioned = Array.from(new Set(mentionedAIs));

    const finalMin = Math.max(
      baseMinResponders,
      uniqueMentioned.length || baseMinResponders,
    );
    const finalMax = Math.max(baseMaxResponders, finalMin);

    const availableForRandom = eligibleAIs.filter(
      (aiId) => !uniqueMentioned.includes(aiId),
    );

    const minAdditional = Math.max(finalMin - uniqueMentioned.length, 0);
    const maxAdditional = Math.max(finalMax - uniqueMentioned.length, 0);

    const additionalResponders =
      maxAdditional > 0
        ? selectRespondingAIs(
            aiServices,
            activeAIs,
            minAdditional,
            maxAdditional,
            availableForRandom,
          )
        : [];

    const responders = [...uniqueMentioned, ...additionalResponders];
    const delays = this.deps.getDelays();

    // Fatigue also stretches delays so late-conversation replies slow down
    const fadeDelayMultiplier = 1 + fadeProgress * (FADE_OUT.MAX_DELAY_STRETCH - 1);

    const queuedResponses = responders.map((aiId, index) => {
      const isMentioned = uniqueMentioned.includes(aiId);
      const tempo = aiServices.get(aiId)?.traits?.tempo ?? 1;
      const delay =
        calculateResponseDelay({
          index,
          isUserResponse,
          isMentioned,
          typingAICount,
          ...delays,
        }) *
        tempo *
        (isUserResponse ? 1 : fadeDelayMultiplier);

      return {
        aiId,
        roomId,
        isUserResponse,
        options: { isMentioned, triggerMessage: lastMessage },
        scheduledTime: Date.now() + Math.floor(delay),
      };
    });

    this.deps.enqueueBatch(queuedResponses);
  }

  /** Pick one AI to casually break a long silence. */
  private scheduleReopening(roomId: string, eligibleAIs: string[]): void {
    const aiServices = this.deps.registry.services;
    const [reopenerAiId] = selectRespondingAIs(
      aiServices,
      eligibleAIs,
      1,
      1,
      eligibleAIs,
    );
    if (!reopenerAiId) return;

    const tempo = aiServices.get(reopenerAiId)?.traits?.tempo ?? 1;
    const delay =
      sampleConversationalDelay(REOPENING.MIN_DELAY_MS, REOPENING.MAX_DELAY_MS) *
      tempo;

    this.deps.enqueueBatch([
      {
        aiId: reopenerAiId,
        roomId,
        isUserResponse: false,
        options: { isReopening: true },
        scheduledTime: Date.now() + Math.floor(delay),
      },
    ]);
  }
}
