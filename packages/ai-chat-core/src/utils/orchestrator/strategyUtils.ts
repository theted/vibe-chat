import {
  CONTEXT_LIMITS,
  MENTION_CONFIG,
  RESPONSE_ENERGY_INSTRUCTIONS,
  RESPONSE_ENERGY_WEIGHTS,
  STRATEGY_ADJUSTMENTS,
  STRATEGY_INSTRUCTIONS,
  STRATEGY_WEIGHTS,
  type ResponseEnergy,
} from "@/orchestrator/constants.js";
import { excerptForQuote } from "@/utils/orchestrator/responseUtils.js";
import { normalizeAlias } from "@/utils/stringUtils.js";

type StrategyOption = {
  type: string;
  weight: number;
};

/**
 * Sample a response energy so message length varies naturally - occasional
 * one-line quips and longer riffs instead of uniform 1-3 sentence replies.
 */
const sampleResponseEnergy = (): ResponseEnergy => {
  const entries = Object.entries(RESPONSE_ENERGY_WEIGHTS) as Array<
    [ResponseEnergy, number]
  >;
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let remaining = Math.random() * totalWeight;
  for (const [energy, weight] of entries) {
    remaining -= weight;
    if (remaining <= 0) return energy;
  }
  return "normal";
};

export const determineInteractionStrategy = (
  aiService,
  context,
  isUserResponse,
  findAIFromContextMessage,
  getMentionTokenForAI,
) => {
  const recentMessages = context.slice(
    -CONTEXT_LIMITS.RECENT_MESSAGES_FOR_STRATEGY,
  );
  const aiMessages = recentMessages.filter((msg) => msg.senderType === "ai");
  const lastMessage = recentMessages[recentMessages.length - 1];

  const strategies: Record<string, StrategyOption> = {
    AGREE_AND_EXPAND: {
      type: "agree-expand",
      weight: STRATEGY_WEIGHTS.AGREE_AND_EXPAND,
    },
    CHALLENGE_AND_DEBATE: {
      type: "challenge",
      weight: STRATEGY_WEIGHTS.CHALLENGE_AND_DEBATE,
    },
    REDIRECT_TOPIC: {
      type: "redirect",
      weight: STRATEGY_WEIGHTS.REDIRECT_TOPIC,
    },
    ASK_QUESTION: { type: "question", weight: STRATEGY_WEIGHTS.ASK_QUESTION },
    DIRECT_RESPONSE: {
      type: "direct",
      weight: STRATEGY_WEIGHTS.DIRECT_RESPONSE,
    },
  };

  if (lastMessage?.senderType === "ai" && !isUserResponse) {
    strategies.CHALLENGE_AND_DEBATE.weight +=
      STRATEGY_ADJUSTMENTS.AI_MESSAGE_BACKGROUND_CHALLENGE;
    strategies.AGREE_AND_EXPAND.weight +=
      STRATEGY_ADJUSTMENTS.AI_MESSAGE_BACKGROUND_AGREE;
  }

  if (aiMessages.length >= STRATEGY_ADJUSTMENTS.MANY_AI_MESSAGES_THRESHOLD) {
    strategies.REDIRECT_TOPIC.weight +=
      STRATEGY_ADJUSTMENTS.MANY_AI_MESSAGES_REDIRECT;
    strategies.ASK_QUESTION.weight +=
      STRATEGY_ADJUSTMENTS.MANY_AI_MESSAGES_QUESTION;
  }

  const selfNormalized =
    aiService.normalizedAlias ||
    normalizeAlias(aiService.alias || aiService.displayName || aiService.name);
  const mentionTargets = new Set(lastMessage?.mentionsNormalized || []);
  const mentionsCurrentAI = mentionTargets.has(selfNormalized);

  let selectedStrategy: StrategyOption = strategies.DIRECT_RESPONSE;
  if (mentionsCurrentAI) {
    selectedStrategy = strategies.DIRECT_RESPONSE;
  } else {
    const randomValue = Math.random();
    let cumulativeWeight = 0;
    for (const strategy of Object.values(strategies)) {
      cumulativeWeight += strategy.weight;
      if (randomValue <= cumulativeWeight) {
        selectedStrategy = strategy;
        break;
      }
    }
  }

  const energy = sampleResponseEnergy();
  let shouldMention = false;
  let targetAI = null;

  const mentionCandidateRaw =
    lastMessage?.alias || lastMessage?.displayName || lastMessage?.sender || "";
  const mentionCandidate = mentionCandidateRaw.trim();
  const shouldMentionUser =
    isUserResponse &&
    lastMessage?.senderType === "user" &&
    mentionCandidate.length > 0;

  if (shouldMentionUser) {
    const cleanedAlias = mentionCandidate.startsWith("@")
      ? mentionCandidate.slice(1)
      : mentionCandidate;

    if (cleanedAlias.length > 0) {
      shouldMention = true;
      targetAI = {
        type: "user",
        alias: cleanedAlias,
        displayName: lastMessage.displayName || cleanedAlias,
      };
    }
  } else if (mentionsCurrentAI) {
    if (lastMessage?.senderType === "ai") {
      const sourceAI = findAIFromContextMessage(lastMessage);
      if (sourceAI && sourceAI.id !== aiService.id) {
        shouldMention = true;
        targetAI = getMentionTokenForAI(sourceAI);
      }
    }
  } else {
    const potentialTargets = [];

    if (lastMessage?.senderType === "ai") {
      const lastAI = findAIFromContextMessage(lastMessage);
      if (lastAI && lastAI.id !== aiService.id) {
        potentialTargets.push(lastAI);
      }
    }

    for (
      let i = aiMessages.length - 1;
      i >= 0 &&
      potentialTargets.length < CONTEXT_LIMITS.POTENTIAL_MENTION_TARGETS;
      i--
    ) {
      const msg = aiMessages[i];
      const targetAIInfo = findAIFromContextMessage(msg);
      if (
        targetAIInfo &&
        targetAIInfo.id !== aiService.id &&
        !potentialTargets.some((existing) => existing.id === targetAIInfo.id)
      ) {
        potentialTargets.push(targetAIInfo);
      }
    }

    // Terse replies read as quick reactions - skip the optional mention, but
    // direct-mention replies above still acknowledge whoever addressed us
    if (potentialTargets.length > 0 && energy !== "terse") {
      shouldMention = Math.random() < MENTION_CONFIG.RANDOM_MENTION_PROBABILITY;
      if (shouldMention) {
        const selected = potentialTargets[0];
        targetAI = getMentionTokenForAI(selected);
      }
    }
  }

  if (!targetAI) {
    shouldMention = false;
  }

  return {
    ...selectedStrategy,
    shouldMention,
    targetAI,
    mentionsCurrentAI,
    energy,
    windingDown: false,
  };
};

export const applyInteractionStrategy = (
  context,
  strategy,
  aiService,
  lastMessage,
) => {
  const enhancedContext = [...context];

  let instructionPrompt = "";

  const aiNormalized =
    aiService.normalizedAlias ||
    normalizeAlias(aiService.alias || aiService.displayName || aiService.name);
  const mentionsCurrentAI =
    lastMessage?.mentionsNormalized?.includes(aiNormalized);
  const mentionerName = lastMessage?.displayName || lastMessage?.sender;
  const mentionerAlias = lastMessage?.alias || lastMessage?.normalizedAlias;
  const mentionerToken = mentionerAlias ? `@${mentionerAlias}` : mentionerName;

  const quotedExcerpt =
    typeof lastMessage?.content === "string"
      ? excerptForQuote(lastMessage.content)
      : "";

  // Reopening overrides the reactive branches - the last message is stale,
  // so responding to it or its mentions would read strangely after a lull
  if (strategy.type === "reopen") {
    instructionPrompt = STRATEGY_INSTRUCTIONS.REOPEN;
  } else if (mentionsCurrentAI) {
    if (lastMessage?.senderType === "ai" && mentionerToken) {
      instructionPrompt = STRATEGY_INSTRUCTIONS.MENTIONED_BY_AI(
        mentionerToken,
        quotedExcerpt,
      );
    } else {
      instructionPrompt = STRATEGY_INSTRUCTIONS.MENTIONED_BY_USER(quotedExcerpt);
    }
  } else {
    switch (strategy.type) {
      case "agree-expand":
        if (lastMessage?.senderType === "ai") {
          instructionPrompt = STRATEGY_INSTRUCTIONS.AGREE_EXPAND(
            lastMessage.sender,
          );
        }
        break;

      case "challenge":
        if (lastMessage?.senderType === "ai") {
          instructionPrompt = STRATEGY_INSTRUCTIONS.CHALLENGE(
            lastMessage.sender,
          );
        }
        break;

      case "redirect":
        instructionPrompt = STRATEGY_INSTRUCTIONS.REDIRECT;
        break;

      case "question":
        instructionPrompt = STRATEGY_INSTRUCTIONS.QUESTION;
        break;

      case "direct":
        instructionPrompt = STRATEGY_INSTRUCTIONS.DIRECT;
        break;
    }
  }

  // Winding down replaces the energy roll - an "expansive" instruction would
  // fight the request to keep things brief
  const energyInstruction = strategy.windingDown
    ? ""
    : RESPONSE_ENERGY_INSTRUCTIONS[strategy.energy] || "";
  const windDownInstruction = strategy.windingDown
    ? STRATEGY_INSTRUCTIONS.WIND_DOWN
    : "";
  const combinedInstruction = [
    instructionPrompt,
    energyInstruction,
    windDownInstruction,
  ]
    .filter(Boolean)
    .join(" ");

  if (combinedInstruction) {
    enhancedContext.push({
      sender: "System",
      content: combinedInstruction,
      senderType: "system",
      role: "system",
      isInternal: true,
    });
  }

  return enhancedContext;
};
