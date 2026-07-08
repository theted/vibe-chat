import {
  DEFAULTS,
  DELAY_CALC,
  DELAY_DISTRIBUTION,
  TIMING,
  TYPING_SIMULATION,
} from "@/orchestrator/constants.js";
import type { OrchestratorAIService } from "@/utils/orchestrator/aiLookup.js";

type AIServiceMap = Map<string, OrchestratorAIService>;

/**
 * Weighted sample without replacement - chattier AIs speak up more often but
 * everyone still gets a turn eventually.
 */
const sampleByChattiness = (
  aiServices: AIServiceMap,
  candidates: string[],
  count: number,
) => {
  const remaining = [...candidates];
  const selected: string[] = [];

  while (selected.length < count && remaining.length > 0) {
    const weights = remaining.map(
      (aiId) => aiServices.get(aiId)?.traits?.chattiness ?? 1,
    );
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let roll = Math.random() * totalWeight;
    let pickedIndex = remaining.length - 1;
    for (let i = 0; i < remaining.length; i++) {
      roll -= weights[i];
      if (roll <= 0) {
        pickedIndex = i;
        break;
      }
    }
    selected.push(remaining[pickedIndex]);
    remaining.splice(pickedIndex, 1);
  }

  return selected;
};

export const selectRespondingAIs = (
  aiServices: AIServiceMap,
  activeAIs: string[],
  minResponders = 1,
  maxResponders = 3,
  candidateList: string[] | null = null,
) => {
  const pool = candidateList || activeAIs;
  const availableAIs = pool.filter((aiId) => {
    const ai = aiServices.get(aiId);
    return ai && ai.isActive;
  });

  const numResponders = Math.min(
    Math.floor(Math.random() * (maxResponders - minResponders + 1)) +
      minResponders,
    availableAIs.length,
  );
  return sampleByChattiness(aiServices, availableAIs, numResponders);
};

/**
 * Standard normal sample via Box-Muller transform.
 */
const sampleStandardNormal = () => {
  const u1 = Math.random() || Number.EPSILON;
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
};

/**
 * Sample a delay from a log-normal distribution shaped to the [minMs, maxMs]
 * band. Uniform sampling makes replies land evenly spread, which reads as a
 * metronome; log-normal clusters most replies early with occasional
 * stragglers - closer to how humans actually reply.
 */
export const sampleConversationalDelay = (minMs: number, maxMs: number) => {
  const spread = Math.max(0, maxMs - minMs);
  const logNormal = Math.exp(DELAY_DISTRIBUTION.SIGMA * sampleStandardNormal());
  const delay =
    minMs + spread * logNormal * DELAY_DISTRIBUTION.MEDIAN_BAND_POSITION;
  return Math.min(delay, maxMs * DELAY_DISTRIBUTION.MAX_OVERSHOOT);
};

/**
 * How long to hold a generated response while the typing indicator stays
 * visible, so long messages visibly "take longer to type" than quips.
 */
export const calculateTypingHold = (responseLength: number) => {
  const typingMs = (responseLength / TYPING_SIMULATION.CHARS_PER_SECOND) * 1000;
  return Math.floor(
    Math.min(
      Math.max(typingMs, TYPING_SIMULATION.MIN_HOLD_MS),
      TYPING_SIMULATION.MAX_HOLD_MS,
    ),
  );
};

export const calculateResponseDelay = ({
  index,
  isUserResponse = true,
  isMentioned = false,
  typingAICount = 0,
  minUserResponseDelay,
  maxUserResponseDelay,
  minBackgroundDelay,
  maxBackgroundDelay,
  minDelayBetweenAI,
  maxDelayBetweenAI,
}: {
  index: number;
  isUserResponse?: boolean;
  isMentioned?: boolean;
  typingAICount?: number;
  minUserResponseDelay: number;
  maxUserResponseDelay: number;
  minBackgroundDelay: number;
  maxBackgroundDelay: number;
  minDelayBetweenAI: number;
  maxDelayBetweenAI: number;
}) => {
  if (index === 0 && isUserResponse) {
    const firstResponderDelay =
      DEFAULTS.MIN_FIRST_RESPONDER_DELAY +
      Math.random() *
        (DEFAULTS.MAX_FIRST_RESPONDER_DELAY -
          DEFAULTS.MIN_FIRST_RESPONDER_DELAY);
    return Math.floor(firstResponderDelay);
  }

  let baseDelay = isUserResponse
    ? sampleConversationalDelay(minUserResponseDelay, maxUserResponseDelay)
    : sampleConversationalDelay(minBackgroundDelay, maxBackgroundDelay);

  if (isMentioned) {
    baseDelay = Math.max(
      TIMING.MIN_MENTIONED_DELAY,
      baseDelay * TIMING.MENTIONED_DELAY_MULTIPLIER,
    );
  }

  // Per-AI sampled gap instead of a fixed ladder: occasionally two AIs land
  // close together ("collisions"), occasionally one lags far behind
  const staggerDelay =
    index * sampleConversationalDelay(minDelayBetweenAI, maxDelayBetweenAI);

  const catchUpDelay =
    Math.pow(Math.random(), DELAY_CALC.CATCH_UP_POWER) *
    DELAY_CALC.CATCH_UP_MULTIPLIER;

  let typingAwarenessDelay = 0;
  if (typingAICount > 0) {
    typingAwarenessDelay =
      typingAICount *
      TIMING.TYPING_AWARENESS_DELAY *
      (0.8 + Math.random() * 0.4);

    if (!isMentioned) {
      const multiplier = Math.min(
        1 + typingAICount * 0.5,
        TIMING.TYPING_AWARENESS_MAX_MULTIPLIER,
      );
      baseDelay *= multiplier;
    }
  }

  return Math.floor(
    baseDelay + staggerDelay + catchUpDelay + typingAwarenessDelay,
  );
};
