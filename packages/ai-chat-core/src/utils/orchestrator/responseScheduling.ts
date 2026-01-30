import { DEFAULTS, DELAY_CALC, TIMING } from "../../orchestrator/constants.js";

export const selectRespondingAIs = (
  aiServices,
  activeAIs,
  minResponders = 1,
  maxResponders = 3,
  candidateList = null
) => {
  const pool = candidateList || activeAIs;
  const availableAIs = pool.filter((aiId) => {
    const ai = aiServices.get(aiId);
    return ai && ai.isActive;
  });

  const numResponders = Math.min(
    Math.floor(Math.random() * (maxResponders - minResponders + 1)) +
      minResponders,
    availableAIs.length
  );
  const shuffled = [...availableAIs].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, numResponders);
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
}) => {
  if (index === 0 && isUserResponse) {
    const firstResponderDelay =
      DEFAULTS.MIN_FIRST_RESPONDER_DELAY +
      Math.random() *
        (DEFAULTS.MAX_FIRST_RESPONDER_DELAY -
          DEFAULTS.MIN_FIRST_RESPONDER_DELAY);
    return Math.floor(firstResponderDelay);
  }

  let baseDelay;

  if (isUserResponse) {
    baseDelay =
      minUserResponseDelay +
      Math.random() * (maxUserResponseDelay - minUserResponseDelay);
  } else {
    baseDelay =
      minBackgroundDelay +
      Math.random() * (maxBackgroundDelay - minBackgroundDelay);
  }

  if (isMentioned) {
    baseDelay = Math.max(
      TIMING.MIN_MENTIONED_DELAY,
      baseDelay * TIMING.MENTIONED_DELAY_MULTIPLIER
    );
  }

  const randomness = Math.random();
  const staggerDelay =
    index * minDelayBetweenAI +
    randomness * (maxDelayBetweenAI - minDelayBetweenAI);

  const catchUpDelay =
    Math.pow(randomness, DELAY_CALC.CATCH_UP_POWER) *
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
        TIMING.TYPING_AWARENESS_MAX_MULTIPLIER
      );
      baseDelay *= multiplier;
    }
  }

  return Math.floor(
    baseDelay + staggerDelay + catchUpDelay + typingAwarenessDelay
  );
};
