import {
  CONTEXT_LIMITS,
  MENTION_CONFIG,
  RESPONSE_ENERGY_INSTRUCTIONS,
  RESPONSE_ENERGY_WEIGHTS,
  STRATEGY_ADJUSTMENTS,
  STRATEGY_INSTRUCTIONS,
  STRATEGY_WEIGHTS,
  TRANSCRIPT,
  type ResponseEnergy,
} from "@/orchestrator/constants.js";
import type {
  ContextMessage,
  InteractionStrategy,
  InteractionStrategyDecision,
  MentionTarget,
} from "@/types/orchestrator.js";
import type { OrchestratorAIService } from "@/utils/orchestrator/aiLookup.js";
import { excerptForQuote } from "@/utils/orchestrator/responseUtils.js";
import { speakerLabel } from "@/utils/orchestrator/transcript.js";
import { normalizeAlias } from "@/utils/stringUtils.js";

type StrategyOption = {
  type: InteractionStrategy;
  weight: number;
};

type FindAIFromContextMessage = (
  message: ContextMessage,
) => OrchestratorAIService | null | undefined;

type GetMentionTokenForAI = (
  ai: OrchestratorAIService,
) => string | null | undefined;

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

/**
 * Decide how an AI answers `replyTarget` - the message it was scheduled to
 * answer, which defaults to the latest one in `context`. Newer messages may
 * have arrived since scheduling; the strategy and any @mention still follow
 * the reply target so the AI answers the right speaker.
 */
export const determineInteractionStrategy = (
  aiService: OrchestratorAIService,
  context: ContextMessage[],
  isUserResponse: boolean,
  findAIFromContextMessage: FindAIFromContextMessage,
  getMentionTokenForAI: GetMentionTokenForAI,
  replyTarget?: ContextMessage | null,
): InteractionStrategyDecision => {
  const recentMessages = context.slice(
    -CONTEXT_LIMITS.RECENT_MESSAGES_FOR_STRATEGY,
  );
  const aiMessages = recentMessages.filter((msg) => msg.senderType === "ai");
  const lastMessage = replyTarget ?? recentMessages[recentMessages.length - 1];

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
  let targetAI: MentionTarget | null = null;

  const mentionCandidateRaw =
    lastMessage?.alias || lastMessage?.displayName || lastMessage?.sender || "";
  const mentionCandidate = mentionCandidateRaw.trim().replace(/^@/, "");

  if (lastMessage?.senderType === "user" && mentionCandidate) {
    shouldMention = true;
    targetAI = {
      type: "user",
      alias: mentionCandidate,
      displayName: lastMessage.displayName || mentionCandidate,
    };
  } else if (mentionsCurrentAI) {
    // Answering an AI that asked us: the reply already reaches it, and a
    // mention back would summon it again and start a two-AI ping-pong
  } else if (lastMessage?.senderType === "ai" && energy !== "terse") {
    // Only ever the speaker being answered - suggesting anyone else is how
    // replies ended up addressed to the wrong AI. Terse replies read as quick
    // reactions, so they skip the optional mention.
    const replyToAI = findAIFromContextMessage(lastMessage);
    if (replyToAI && replyToAI.id !== aiService.id) {
      shouldMention = Math.random() < MENTION_CONFIG.RANDOM_MENTION_PROBABILITY;
      targetAI = shouldMention
        ? (getMentionTokenForAI(replyToAI) ?? null)
        : null;
    }
  }

  if (!targetAI) {
    shouldMention = false;
  }

  return {
    ...selectedStrategy,
    shouldMention,
    targetAI,
    mentionHandle: shouldMention ? resolveMentionHandle(targetAI) : null,
    mentionsCurrentAI,
    energy,
    windingDown: false,
  };
};

/**
 * Resolve a strategy mention target (user object or AI mention token) to the
 * literal @handle the model should write, preserving original casing.
 */
const resolveMentionHandle = (
  targetAI: MentionTarget | null,
): string | null => {
  const source =
    typeof targetAI === "object"
      ? (targetAI?.displayName || targetAI?.alias || "").trim()
      : (targetAI || "").trim();

  if (!source) return null;
  return source.startsWith("@") ? source : `@${source}`;
};

/**
 * The note appended to the final user turn telling the AI what this message
 * should do: who it is answering, the strategy, any @mention, and length.
 */
export const buildTurnInstruction = (
  strategy: InteractionStrategyDecision,
  aiService: OrchestratorAIService,
  replyTarget: ContextMessage | null | undefined,
): string => {
  const aiNormalized =
    aiService.normalizedAlias ||
    normalizeAlias(aiService.alias || aiService.displayName || aiService.name);
  const mentionsCurrentAI =
    replyTarget?.mentionsNormalized?.includes(aiNormalized) ?? false;
  const targetLabel = replyTarget ? speakerLabel(replyTarget) : "";
  const mentionerAlias = replyTarget?.alias || replyTarget?.normalizedAlias;
  const mentionerToken = mentionerAlias ? `@${mentionerAlias}` : targetLabel;

  const quotedExcerpt =
    typeof replyTarget?.content === "string"
      ? excerptForQuote(replyTarget.content)
      : "";
  const selfName = aiService.displayName || aiService.name || "";

  // The snapshot of what a quote-reply answers, which may have left the
  // window: without it the model can't tell what the person was replying to
  const quoteLine = replyTarget?.replyToExcerpt
    ? STRATEGY_INSTRUCTIONS.QUOTED_MESSAGE(
        replyTarget.replyToSender === selfName
          ? null
          : (replyTarget.replyToSender ?? null),
        excerptForQuote(replyTarget.replyToExcerpt),
      )
    : "";

  let replyLine = "";
  let instructionPrompt = "";

  // Reopening overrides the reactive branches - the last message is stale,
  // so responding to it or its mentions would read strangely after a lull
  if (strategy.type === "reopen") {
    instructionPrompt = STRATEGY_INSTRUCTIONS.REOPEN;
  } else if (mentionsCurrentAI) {
    instructionPrompt =
      replyTarget?.senderType === "ai" && mentionerToken
        ? STRATEGY_INSTRUCTIONS.MENTIONED_BY_AI(mentionerToken, quotedExcerpt)
        : STRATEGY_INSTRUCTIONS.MENTIONED_BY_USER(quotedExcerpt);
  } else {
    if (replyTarget && quotedExcerpt) {
      replyLine = STRATEGY_INSTRUCTIONS.REPLY_TO(targetLabel, quotedExcerpt);
    }
    const isReplyToAI = replyTarget?.senderType === "ai";
    switch (strategy.type) {
      case "agree-expand":
        if (isReplyToAI) {
          instructionPrompt = STRATEGY_INSTRUCTIONS.AGREE_EXPAND(targetLabel);
        }
        break;
      case "challenge":
        if (isReplyToAI) {
          instructionPrompt = STRATEGY_INSTRUCTIONS.CHALLENGE(targetLabel);
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

  // Prompt-driven mentions: ask the model to weave the @handle in itself
  // instead of templating it onto the finished response afterwards. Skip when
  // the strategy instruction already names the same handle so the prompt
  // doesn't push the mention twice. A 1-1 room has nobody else to hand off
  // to, so the mention instruction is dropped outright.
  const handleAlreadyReferenced =
    strategy.mentionHandle &&
    instructionPrompt
      .toLowerCase()
      .includes(strategy.mentionHandle.toLowerCase());
  const mentionInstruction =
    !strategy.isPrivateChat &&
    strategy.shouldMention &&
    strategy.mentionHandle &&
    !handleAlreadyReferenced
      ? STRATEGY_INSTRUCTIONS.MENTION_TARGET(strategy.mentionHandle)
      : "";

  // Winding down replaces the energy roll - an "expansive" instruction would
  // fight the request to keep things brief
  const energyInstruction = strategy.windingDown
    ? ""
    : RESPONSE_ENERGY_INSTRUCTIONS[strategy.energy] || "";
  const windDownInstruction = strategy.windingDown
    ? STRATEGY_INSTRUCTIONS.WIND_DOWN
    : "";
  const privateChatInstruction = strategy.isPrivateChat
    ? STRATEGY_INSTRUCTIONS.PRIVATE_CHAT
    : strategy.isPrivateGroup
      ? STRATEGY_INSTRUCTIONS.PRIVATE_GROUP
      : "";

  const body = [
    selfName ? `Your turn, ${selfName}.` : "",
    replyLine,
    instructionPrompt,
    quoteLine,
    privateChatInstruction,
    mentionInstruction,
    energyInstruction,
    windDownInstruction,
    TRANSCRIPT.NO_LABEL_REMINDER,
  ]
    .filter(Boolean)
    .join(" ");

  return `${TRANSCRIPT.TURN_HEADER}\n${body}`;
};
