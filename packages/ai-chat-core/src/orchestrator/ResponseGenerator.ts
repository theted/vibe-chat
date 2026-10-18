/**
 * ResponseGenerator - Produces a single AI response: builds the strategy,
 * system prompt and labelled transcript, calls the AI service,
 * post-processes mentions, claims a slot in the room's AI-message budget and
 * enqueues the resulting message. Emits the ai-generating-start/stop,
 * ai-response, and ai-error lifecycle events on the orchestrator.
 */

import type { AIRegistry } from "./AIRegistry.js";
import type { ContextManager } from "./ContextManager.js";
import type { GenerateResponseOptions } from "./ResponseQueue.js";
import type { Message } from "@/types/index.js";
import type { ContextMessage } from "@/types/orchestrator.js";
import { CONTEXT_LIMITS, FADE_OUT } from "./constants.js";
import {
  findAIByNormalizedAlias,
  findAIFromContextMessage,
  getMentionTokenForAI,
  type OrchestratorAIService,
} from "@/utils/orchestrator/aiLookup.js";
import { logAIContext } from "@/utils/orchestrator/logging.js";
import {
  limitMentionsInResponse,
  responseIncludesMention,
  stripAIMentions,
} from "@/utils/orchestrator/mentionUtils.js";
import { createEnhancedSystemPrompt } from "@/utils/orchestrator/promptBuilder.js";
import { calculateTypingHold } from "@/utils/orchestrator/responseScheduling.js";
import { truncateResponse } from "@/utils/orchestrator/responseUtils.js";
import {
  buildTurnInstruction,
  determineInteractionStrategy,
} from "@/utils/orchestrator/strategyUtils.js";
import {
  buildTranscript,
  stripOwnSpeakerLabel,
} from "@/utils/orchestrator/transcript.js";

type ResponseGeneratorDeps = {
  registry: AIRegistry;
  contextManager: ContextManager;
  emit: (event: string, payload: unknown) => void;
  enqueueMessage: (message: ContextMessage) => void;
  /** Frees the queue slot this response was dispatched into. */
  onResponseComplete: (roomId: string) => void;
  /** Whether the room still has AI-message budget left. */
  canSpeak: (roomId: string) => boolean;
  /** Reserve one AI message in the room; false means drop the response. */
  claimTurn: (roomId: string) => boolean;
  /** How close the room's AI-message budget is to running out, 0..1. */
  getFatigue: (roomId: string) => number;
  /** Private 1-1 room: no other AI is present to address. */
  isDirectOnly: (roomId: string) => boolean;
  /** Private group: only the room's members may be addressed. */
  isPrivateGroup: (roomId: string) => boolean;
  /** The AIs allowed to speak in the room, for the system prompt. */
  getRoomAIs: (roomId: string) => OrchestratorAIService[];
  isVerbose: () => boolean;
};

export class ResponseGenerator {
  constructor(private readonly deps: ResponseGeneratorDeps) {}

  async generate(
    aiId: string,
    roomId: string,
    isUserResponse = true,
    options: GenerateResponseOptions = {},
  ): Promise<void> {
    const { registry, contextManager, emit } = this.deps;
    const aiServices = registry.services;
    const aiService = aiServices.get(aiId);

    // Every dispatched response holds a queue slot, so even the early exits
    // must give it back or the queue eventually stalls for good
    if (
      !aiService?.isActive ||
      !aiService.service ||
      !this.deps.canSpeak(roomId)
    ) {
      this.deps.onResponseComplete(roomId);
      return;
    }

    const aiMeta = {
      aiId,
      displayName: aiService.displayName || aiService.name,
      alias: aiService.alias,
      normalizedAlias: aiService.normalizedAlias,
      emoji: aiService.emoji,
      providerKey: aiService.config?.providerKey,
      modelKey: aiService.config?.modelKey,
      roomId,
      isUserResponse,
      isMentioned: options.isMentioned || false,
    };

    emit("ai-generating-start", aiMeta);
    aiService.isGenerating = true;
    const responseStartTime = Date.now();
    let queueSlotReleased = false;

    try {
      console.log(
        `🤖 ${aiService.name} is generating ${
          isUserResponse ? "user response" : "background message"
        }...`,
      );

      // Scoped to the room so a private 1-1 chat never sees the main room's
      // conversation (and its replies never leak back into it).
      const context = contextManager.getContextForAI(
        CONTEXT_LIMITS.AI_CONTEXT_SIZE,
        roomId,
      );
      // The message this response was scheduled to answer. Newer messages may
      // have arrived since; they stay in the transcript, but the reply (and
      // any @mention) still goes to the right speaker.
      const replyTarget = options.isReopening
        ? null
        : (options.triggerMessage ?? context[context.length - 1] ?? null);
      let interactionStrategy = determineInteractionStrategy(
        aiService,
        context,
        isUserResponse,
        (message) => findAIFromContextMessage(aiServices, message),
        (ai) => getMentionTokenForAI(ai),
        replyTarget,
      );

      const roomAIs = this.deps.getRoomAIs(roomId);

      // In a 1-1 room there is nobody else to hand off to, so drop any mention
      // the strategy picked before it reaches the prompt.
      const isPrivateChat = this.deps.isDirectOnly(roomId);
      const isPrivateGroup = !isPrivateChat && this.deps.isPrivateGroup(roomId);
      const memberIds = new Set(roomAIs.map((ai) => ai.id));
      if (isPrivateChat) {
        interactionStrategy = {
          ...interactionStrategy,
          isPrivateChat: true,
          shouldMention: false,
          mentionHandle: null,
          targetAI: null,
        };
      }

      // A private group's transcript can name a model that has since been
      // removed (history carries over when the cast changes), so only members
      // are handed the turn.
      if (isPrivateGroup) {
        const memberTokens = new Set(roomAIs.map(getMentionTokenForAI));
        const { targetAI } = interactionStrategy;
        const targetsOutsider =
          typeof targetAI === "string" && !memberTokens.has(targetAI);
        interactionStrategy = {
          ...interactionStrategy,
          isPrivateGroup: true,
          ...(targetsOutsider
            ? { shouldMention: false, mentionHandle: null, targetAI: null }
            : {}),
        };
      }

      if (options.isReopening) {
        // Reopening a quiet room replaces the usual reactive strategies -
        // the last message is stale, so don't reply to or mention its sender
        interactionStrategy = {
          ...interactionStrategy,
          type: "reopen",
          shouldMention: false,
          targetAI: null,
        };
      }

      if (
        !isUserResponse &&
        this.deps.getFatigue(roomId) >= FADE_OUT.WIND_DOWN_RATIO
      ) {
        interactionStrategy = { ...interactionStrategy, windingDown: true };
      }

      const systemPrompt = createEnhancedSystemPrompt(
        aiService,
        context,
        isUserResponse,
        aiServices,
        {
          conversationDigest: contextManager.getConversationDigest(roomId),
          roomAIs,
        },
      );
      const messages: Message[] = [
        { role: "system", content: systemPrompt },
        ...buildTranscript(
          aiService,
          context,
          buildTurnInstruction(interactionStrategy, aiService, replyTarget),
        ),
      ];

      logAIContext(aiService, messages, this.deps.isVerbose());

      const response = await aiService.service.generateResponse(messages);
      const responseTimeMs = Date.now() - responseStartTime;
      aiService.lastMessageTime = Date.now();

      const processedResponse = this.cleanResponse(
        truncateResponse(response),
        aiService,
        (target) =>
          !isPrivateChat && (!isPrivateGroup || memberIds.has(target.id)),
      );
      if (!processedResponse) {
        throw new Error("Model returned an empty response");
      }

      // Telemetry: the MENTION_TARGET instruction lets the model skip forced
      // mentions - track follow-through to tune the wording and probability
      if (
        interactionStrategy.shouldMention &&
        interactionStrategy.mentionHandle
      ) {
        const mentionIncluded = responseIncludesMention(
          processedResponse,
          interactionStrategy.mentionHandle,
        );
        console.log(
          `📊 Mention telemetry: ${aiService.name} → ${interactionStrategy.mentionHandle} included=${mentionIncluded} (strategy=${interactionStrategy.type}, energy=${interactionStrategy.energy})`,
        );
        emit("mention-telemetry", {
          aiId,
          aiName: aiService.displayName || aiService.name,
          mentionHandle: interactionStrategy.mentionHandle,
          included: mentionIncluded,
          strategy: interactionStrategy.type,
          energy: interactionStrategy.energy,
          isUserResponse,
          roomId,
        });
      }

      console.log(
        `✨ ${aiService.name} ${interactionStrategy.type}: ${processedResponse.substring(0, 100)}${processedResponse.length > 100 ? "..." : ""}`,
      );

      const aiMessage: ContextMessage = {
        sender: aiService.displayName || aiService.name,
        displayName: aiService.displayName || aiService.name,
        alias: aiService.alias,
        normalizedAlias: aiService.normalizedAlias,
        content: processedResponse,
        senderType: "ai",
        roomId,
        aiId,
        aiName: aiService.displayName || aiService.name,
        modelKey: aiService.config?.modelKey,
        modelId: aiService.service?.getModel?.() || aiService.config?.modelKey,
        providerKey: aiService.config?.providerKey,
        mentionsTriggerMessageId:
          options.isMentioned && options.triggerMessage
            ? options.triggerMessage.id
            : null,
        mentionsTriggerSender:
          options.isMentioned && options.triggerMessage
            ? options.triggerMessage.sender
            : null,
        responseType: interactionStrategy.type,
        interactionStrategy: interactionStrategy.type,
        priority: isUserResponse ? 500 : 0,
      };

      // The hard cap: claim the room's budget before posting. If the room
      // hit its limit while this reply was generating, the reply is dropped.
      if (!this.deps.claimTurn(roomId)) {
        console.info(
          `🔇 Dropping ${aiService.name}'s reply in ${roomId}: the room reached its AI message limit`,
        );
        return;
      }

      // Free the API concurrency slot before the simulated-typing hold so
      // other AIs can start generating while this one "types"
      this.deps.onResponseComplete(roomId);
      queueSlotReleased = true;

      // Hold the finished message while the typing indicator stays visible,
      // so long responses visibly take longer to "type" than quick quips
      const typingHoldMs = calculateTypingHold(processedResponse.length);
      await new Promise((resolve) => setTimeout(resolve, typingHoldMs));

      this.deps.enqueueMessage(aiMessage);
      emit("ai-response", { ...aiMeta, responseTimeMs });
    } catch (error) {
      const responseTimeMs = Date.now() - responseStartTime;
      console.error(
        `❌ AI ${aiId} failed to generate response:`,
        (error as Error).message,
      );
      emit("ai-error", { ...aiMeta, aiId, error, responseTimeMs });
    } finally {
      aiService.isGenerating = false;
      if (!queueSlotReleased) {
        this.deps.onResponseComplete(roomId);
      }
      emit("ai-generating-stop", aiMeta);
    }
  }

  /**
   * Tidy a raw model reply: drop a "[Name]" label copied from the transcript,
   * mention each target at most once (MENTION_LIMITS caps how many), and
   * demote mentions that would misfire - the AI's own handle anywhere, and
   * any AI that isn't there to answer: every other AI in a 1-1 room, anyone
   * outside a private group.
   */
  private cleanResponse(
    response: string,
    aiService: OrchestratorAIService,
    canAddress: (target: OrchestratorAIService) => boolean,
  ): string {
    const aiServices = this.deps.registry.services;
    const withoutLabel = stripOwnSpeakerLabel(response, aiService).trim();
    const withoutMisfires = stripAIMentions(withoutLabel, (token) => {
      // A token that resolves to no AI is a person's handle and keeps its @
      const target = findAIByNormalizedAlias(aiServices, token);
      if (!target) return false;
      return target.id === aiService.id || !canAddress(target);
    });
    return limitMentionsInResponse(withoutMisfires);
  }
}
