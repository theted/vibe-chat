/**
 * ResponseScheduler - Decides which AIs answer a message and when, then
 * enqueues the resulting batch on the response queue.
 *
 * Rules, in order:
 * - Nothing is scheduled past the room's AI-message budget (see
 *   AIStreakTracker); queued and generating replies count against it.
 * - A message that @mentions AIs in the room is answered by exactly those
 *   AIs - nobody else steps in, even if a mentioned AI is busy.
 * - Otherwise a few AIs are picked at random, weighted by chattiness.
 * - An AI never gets a second queued reply in the same room; a new mention
 *   retargets the reply it already has queued instead (unless that reply
 *   answers a person who @mentioned it).
 * - Every queued reply carries the message it answers, so a reply that is
 *   generated after newer messages arrive still answers the right speaker.
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
  getLastMessage: (roomId: string) => ContextMessage | undefined;
  filterAIsForRoom: (roomId: string, aiIds: string[]) => string[];
  /** Private 1-1 room: one reply per user message, no background chatter. */
  isDirectOnly: (roomId: string) => boolean;
  /** Room is waiting for @Chat's answer: AIs don't start rounds of their own. */
  isOnHold: (roomId: string) => boolean;
  /** AI messages the room can still take, minus replies already in flight. */
  getAvailableBudget: (roomId: string) => number;
  /** How close the room's AI-message budget is to running out, 0..1. */
  getFatigue: (roomId: string) => number;
  enqueueBatch: (responses: QueuedResponse[]) => void;
  findPending: (roomId: string, aiId: string) => QueuedResponse | undefined;
  retarget: (
    pending: QueuedResponse,
    update: Pick<QueuedResponse, "isUserResponse" | "options" | "scheduledTime">,
  ) => void;
  getDelays: () => ResponseDelays;
};

export type ScheduleOptions = {
  /** Message being answered; defaults to the room's latest message. */
  trigger?: ContextMessage;
  /** Single AI reopening a quiet room - see REOPENING constants. */
  isReopening?: boolean;
};

type ReplyPlan = {
  roomId: string;
  trigger: ContextMessage | undefined;
  isUserResponse: boolean;
  isMentioned: boolean;
  /** Stretches background delays as the room's budget runs out. */
  delayMultiplier?: number;
};

export class ResponseScheduler {
  constructor(private readonly deps: ResponseSchedulerDeps) {}

  /**
   * Schedule a round of replies to a message: a human's post (isUserResponse)
   * or a background tick.
   */
  schedule(
    roomId: string,
    isUserResponse = true,
    { trigger: explicitTrigger, isReopening = false }: ScheduleOptions = {},
  ): void {
    const roomAIs = this.getRoomAIs(roomId);
    const budget = this.deps.getAvailableBudget(roomId);
    if (roomAIs.length === 0 || budget <= 0) return;

    const trigger = explicitTrigger ?? this.deps.getLastMessage(roomId);

    // A private 1-1 chat only ever answers the user, exactly once. Background
    // rounds and silence-breakers would make the model talk to itself.
    if (this.deps.isDirectOnly(roomId)) {
      if (!isUserResponse || isReopening) return;
      this.scheduleDirectReply(roomId, roomAIs[0], trigger);
      return;
    }

    if (!isUserResponse && this.deps.isOnHold(roomId)) return;

    if (isReopening) {
      this.scheduleReopening(roomId, this.getIdleAIs(roomId, roomAIs));
      return;
    }

    const mentioned = this.getMentionedAIs(trigger, roomAIs);
    if (mentioned.length > 0) {
      this.enqueueReplies(mentioned, budget, {
        roomId,
        trigger,
        isUserResponse,
        isMentioned: true,
      });
      return;
    }

    // Fade-out: as the AI-message budget depletes, background rounds get
    // skipped more often so the conversation trails off instead of stopping
    const fadeProgress = this.getFadeProgress(roomId);
    if (!isUserResponse && fadeProgress > 0) {
      const responseProbability =
        1 - fadeProgress * (1 - FADE_OUT.MIN_RESPONSE_PROBABILITY);
      if (Math.random() > responseProbability) return;
    }

    // Whoever wrote the message doesn't answer it
    const eligibleAIs = this.getIdleAIs(roomId, roomAIs).filter(
      (aiId) => aiId !== trigger?.aiId,
    );
    if (eligibleAIs.length === 0) return;

    const { min, max } = this.getResponderRange(
      eligibleAIs.length,
      isUserResponse,
    );
    const responders = selectRespondingAIs(
      this.deps.registry.services,
      eligibleAIs,
      Math.min(min, budget),
      Math.min(max, budget),
      eligibleAIs,
    );

    this.enqueueReplies(responders, budget, {
      roomId,
      trigger,
      isUserResponse,
      isMentioned: false,
      // Fatigue also stretches delays so late-conversation replies slow down
      delayMultiplier: isUserResponse
        ? 1
        : 1 + fadeProgress * (FADE_OUT.MAX_DELAY_STRETCH - 1),
    });
  }

  /**
   * An AI message was just posted: the AIs it @mentions answer it. In a
   * private room that is only ever @Chat handing its answer back to the
   * room's AI.
   */
  scheduleMentionReplies(roomId: string, message: ContextMessage): void {
    if (message.senderType !== "ai" || this.deps.isOnHold(roomId)) return;

    const roomAIs = this.getRoomAIs(roomId);
    const mentioned = this.getMentionedAIs(message, roomAIs);
    const budget = this.deps.getAvailableBudget(roomId);
    if (mentioned.length === 0 || budget <= 0) return;

    this.enqueueReplies(mentioned, budget, {
      roomId,
      trigger: message,
      isUserResponse: false,
      isMentioned: true,
    });
  }

  private getRoomAIs(roomId: string): string[] {
    const { registry, filterAIsForRoom } = this.deps;
    return filterAIsForRoom(roomId, registry.activeIds).filter(
      (aiId) => registry.services.get(aiId)?.isActive,
    );
  }

  /** Room AIs free to take on a new reply: not generating, none queued. */
  private getIdleAIs(roomId: string, roomAIs: string[]): string[] {
    return roomAIs.filter(
      (aiId) =>
        !this.deps.registry.services.get(aiId)?.isGenerating &&
        !this.deps.findPending(roomId, aiId),
    );
  }

  /** Room AIs the message @mentions, never including its own author. */
  private getMentionedAIs(
    message: ContextMessage | undefined,
    roomAIs: string[],
  ): string[] {
    const targets = new Set(message?.mentionsNormalized ?? []);
    if (targets.size === 0) return [];

    return roomAIs.filter((aiId) => {
      const alias = this.deps.registry.services.get(aiId)?.normalizedAlias;
      return alias != null && targets.has(alias) && aiId !== message?.aiId;
    });
  }

  private getFadeProgress(roomId: string): number {
    const fatigue = this.deps.getFatigue(roomId);
    if (fatigue <= FADE_OUT.START_RATIO) return 0;
    return Math.min(
      (fatigue - FADE_OUT.START_RATIO) / (1 - FADE_OUT.START_RATIO),
      1,
    );
  }

  private getResponderRange(eligibleCount: number, isUserResponse: boolean) {
    if (isUserResponse) {
      const max = Math.min(
        Math.max(
          RESPONDER_CONFIG.USER_RESPONSE_MIN_COUNT,
          Math.ceil(eligibleCount * RESPONDER_CONFIG.USER_RESPONSE_MAX_MULTIPLIER),
        ),
        RESPONDER_CONFIG.USER_RESPONSE_MAX_COUNT,
      );
      return { min: RESPONDER_CONFIG.USER_RESPONSE_MIN_BASE, max };
    }

    const max = Math.min(
      Math.max(
        RESPONDER_CONFIG.BACKGROUND_MIN_COUNT,
        Math.ceil(eligibleCount * RESPONDER_CONFIG.BACKGROUND_MAX_MULTIPLIER),
      ),
      RESPONDER_CONFIG.BACKGROUND_MAX_COUNT,
    );
    return { min: RESPONDER_CONFIG.BACKGROUND_MIN_BASE, max };
  }

  /**
   * Queue one reply per AI, staggered. An AI that already has a reply queued
   * in the room gets it retargeted at this message when it was @mentioned
   * here, and is otherwise left alone - one queued reply per AI per room.
   */
  private enqueueReplies(
    aiIds: string[],
    budget: number,
    { roomId, trigger, isUserResponse, isMentioned, delayMultiplier = 1 }: ReplyPlan,
  ): void {
    const { registry, getDelays, findPending, retarget } = this.deps;
    const delays = getDelays();
    const typingAICount = this.getRoomAIs(roomId).filter(
      (aiId) => registry.services.get(aiId)?.isGenerating,
    ).length;

    const fresh: QueuedResponse[] = [];
    aiIds.forEach((aiId, index) => {
      const tempo = registry.services.get(aiId)?.traits?.tempo ?? 1;
      const delay =
        calculateResponseDelay({
          index,
          isUserResponse,
          isMentioned,
          typingAICount,
          ...delays,
        }) *
        tempo *
        delayMultiplier;
      const reply = {
        isUserResponse,
        options: { isMentioned, triggerMessage: trigger },
        scheduledTime: Date.now() + Math.floor(delay),
      };

      const pending = findPending(roomId, aiId);
      if (pending) {
        if (isMentioned && !this.owesPerson(pending, trigger)) {
          retarget(pending, reply);
        }
        return;
      }
      if (fresh.length < budget) fresh.push({ aiId, roomId, ...reply });
    });

    this.deps.enqueueBatch(fresh);
  }

  /**
   * A queued reply to a person who @mentioned the AI isn't handed over to
   * an AI's later mention - the person would never get their answer.
   */
  private owesPerson(
    pending: QueuedResponse,
    newTrigger: ContextMessage | undefined,
  ): boolean {
    return (
      Boolean(pending.options.isMentioned) &&
      pending.options.triggerMessage?.senderType === "user" &&
      newTrigger?.senderType !== "user"
    );
  }

  /**
   * The single reply an AI owes the user in a private 1-1 room. No mention
   * bonus and no staggering: there is nobody else queued to stagger against.
   * Unlike the group room this ignores isGenerating: the one model here owes
   * the user an answer even when it is mid-reply in another room.
   */
  private scheduleDirectReply(
    roomId: string,
    aiId: string,
    trigger: ContextMessage | undefined,
  ): void {
    const delays = this.deps.getDelays();
    const tempo = this.deps.registry.services.get(aiId)?.traits?.tempo ?? 1;
    const delay =
      calculateResponseDelay({
        index: 0,
        isUserResponse: true,
        isMentioned: true,
        typingAICount: 0,
        ...delays,
      }) * tempo;
    const reply = {
      isUserResponse: true,
      options: { isMentioned: true, triggerMessage: trigger },
      scheduledTime: Date.now() + Math.floor(delay),
    };

    // A follow-up sent before the first answer went out folds into it
    const pending = this.deps.findPending(roomId, aiId);
    if (pending) {
      this.deps.retarget(pending, reply);
      return;
    }
    this.deps.enqueueBatch([{ aiId, roomId, ...reply }]);
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
      sampleConversationalDelay(
        REOPENING.MIN_DELAY_MS,
        REOPENING.MAX_DELAY_MS,
      ) * tempo;

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
