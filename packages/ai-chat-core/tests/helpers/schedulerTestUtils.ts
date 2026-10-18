/**
 * Builds a ResponseScheduler over three fake AIs (AI_ONE..AI_THREE, aliases
 * ai_one..ai_three) with a plain array standing in for the response queue,
 * so tests can inspect what got scheduled without timers.
 */

import type { AIRegistry } from "@/orchestrator/AIRegistry.js";
import type { QueuedResponse } from "@/orchestrator/ResponseQueue.js";
import { ResponseScheduler } from "@/orchestrator/ResponseScheduler.js";
import type { ContextMessage } from "@/types/orchestrator.js";

export const AI_IDS = ["AI_ONE", "AI_TWO", "AI_THREE"] as const;

type SchedulerTestOptions = {
  fatigue?: number;
  /** AI messages the room may still take. */
  budget?: number;
  directOnlyRooms?: string[];
  privateGroupRooms?: string[];
  heldRooms?: string[];
  allowedByRoom?: Record<string, string[]>;
  lastMessage?: ContextMessage;
};

export const makeTestScheduler = ({
  fatigue = 0,
  budget = 10,
  directOnlyRooms = [],
  privateGroupRooms = [],
  heldRooms = [],
  allowedByRoom = {},
  lastMessage,
}: SchedulerTestOptions = {}) => {
  const services = new Map(
    AI_IDS.map((id) => [
      id as string,
      {
        id,
        isActive: true,
        isGenerating: false,
        normalizedAlias: id.toLowerCase().replace("_", ""),
        traits: { tempo: 1, chattiness: 1 },
      },
    ]),
  );
  const registry = {
    services,
    activeIds: [...services.keys()],
  } as unknown as AIRegistry;

  const batches: QueuedResponse[][] = [];
  const pending: QueuedResponse[] = [];
  const state = { budget, lastMessage };

  const scheduler = new ResponseScheduler({
    registry,
    getLastMessage: () => state.lastMessage,
    filterAIsForRoom: (roomId, aiIds) =>
      allowedByRoom[roomId]
        ? aiIds.filter((id) => allowedByRoom[roomId].includes(id))
        : aiIds,
    isDirectOnly: (roomId) => directOnlyRooms.includes(roomId),
    isPrivateGroup: (roomId) => privateGroupRooms.includes(roomId),
    isOnHold: (roomId) => heldRooms.includes(roomId),
    getAvailableBudget: (roomId) =>
      state.budget - pending.filter((r) => r.roomId === roomId).length,
    getFatigue: () => fatigue,
    enqueueBatch: (responses) => {
      batches.push(responses);
      pending.push(...responses);
    },
    findPending: (roomId, aiId) =>
      pending.find((r) => r.roomId === roomId && r.aiId === aiId),
    retarget: (target, update) => {
      target.isUserResponse = update.isUserResponse;
      target.options = update.options;
      target.scheduledTime = Math.min(
        target.scheduledTime,
        update.scheduledTime,
      );
    },
    getDelays: () => ({
      minUserResponseDelay: 0,
      maxUserResponseDelay: 1,
      minBackgroundDelay: 0,
      maxBackgroundDelay: 1,
      minDelayBetweenAI: 0,
      maxDelayBetweenAI: 1,
    }),
  });

  /** Forget everything queued so far, as if it had all been answered. */
  const drain = () => {
    pending.length = 0;
    batches.length = 0;
  };

  return { scheduler, services, batches, pending, state, drain };
};

/** A stored room message as ContextManager would hand it to the scheduler. */
export const roomMessage = (
  overrides: Partial<ContextMessage> & Pick<ContextMessage, "senderType">,
): ContextMessage => ({
  id: `msg-${Math.random().toString(36).slice(2)}`,
  sender: overrides.senderType === "user" ? "ada" : "Some AI",
  content: "hello",
  roomId: "default",
  mentionsNormalized: [],
  ...overrides,
});
