/**
 * ResponseGenerator - Produces a single AI response: builds the strategy +
 * system prompt + context, calls the AI service, post-processes mentions,
 * and enqueues the resulting message. Emits the ai-generating-start/stop,
 * ai-response, and ai-error lifecycle events on the orchestrator.
 */

import type { AIRegistry } from "./AIRegistry.js";
import type { ContextManager } from "./ContextManager.js";
import type { GenerateResponseOptions } from "./ResponseQueue.js";
import type { Message } from "@/types/index.js";
import type { ContextMessage } from "@/types/orchestrator.js";
import { CONTEXT_LIMITS, FADE_OUT } from "./constants.js";
import {
  findAIFromContextMessage,
  getMentionTokenForAI,
} from "@/utils/orchestrator/aiLookup.js";
import { logAIContext } from "@/utils/orchestrator/logging.js";
import { limitMentionsInResponse } from "@/utils/orchestrator/mentionUtils.js";
import { createEnhancedSystemPrompt } from "@/utils/orchestrator/promptBuilder.js";
import { calculateTypingHold } from "@/utils/orchestrator/responseScheduling.js";
import { truncateResponse } from "@/utils/orchestrator/responseUtils.js";
import {
  applyInteractionStrategy,
  determineInteractionStrategy,
} from "@/utils/orchestrator/strategyUtils.js";

type ResponseGeneratorDeps = {
  registry: AIRegistry;
  contextManager: ContextManager;
  emit: (event: string, payload: unknown) => void;
  enqueueMessage: (message: unknown) => void;
  onResponseComplete: () => void;
  isAsleep: () => boolean;
  /** How close the AI-message budget is to running out, 0..1. */
  getFatigue: () => number;
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
    const { registry, contextManager, emit, isAsleep } = this.deps;
    if (isAsleep()) return;

    const aiServices = registry.services;
    const aiService = aiServices.get(aiId);
    if (!aiService?.isActive) return;

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

      let context = contextManager.getContextForAI(CONTEXT_LIMITS.AI_CONTEXT_SIZE);
      let interactionStrategy = determineInteractionStrategy(
        aiService,
        context,
        isUserResponse,
        (message) => findAIFromContextMessage(aiServices, message),
        (ai) => getMentionTokenForAI(ai),
      );

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

      if (!isUserResponse && this.deps.getFatigue() >= FADE_OUT.WIND_DOWN_RATIO) {
        interactionStrategy = { ...interactionStrategy, windingDown: true };
      }

      // Quote the message that triggered this response - by generation time
      // newer messages may have arrived, so the last message isn't always it
      const replyTarget =
        (options.isMentioned && options.triggerMessage) ||
        context[context.length - 1];

      context = applyInteractionStrategy(
        context,
        interactionStrategy,
        aiService,
        replyTarget,
      );

      const systemPrompt = createEnhancedSystemPrompt(
        aiService,
        context,
        isUserResponse,
        aiServices,
      );
      const systemMessage: ContextMessage = {
        role: "system",
        content: systemPrompt,
        senderType: "system",
        isInternal: true,
      };
      const messagesWithSystem = [systemMessage, ...context];

      logAIContext(aiService, messagesWithSystem, this.deps.isVerbose());

      // Safe cast: ContextManager derives `role` for every stored message and
      // the instruction/system messages above set it explicitly
      const response = await aiService.service.generateResponse(
        messagesWithSystem as Message[],
      );
      const responseTimeMs = Date.now() - responseStartTime;
      let processedResponse = truncateResponse(response);
      aiService.lastMessageTime = Date.now();

      // Mentions are prompt-driven (MENTION_TARGET instruction); only cap
      // runaway @mentions here rather than templating any in post-hoc
      processedResponse = limitMentionsInResponse(processedResponse);

      console.log(
        `✨ ${aiService.name} ${interactionStrategy.type}: ${processedResponse.substring(0, 100)}${processedResponse.length > 100 ? "..." : ""}`,
      );

      const aiMessage = {
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

      // Free the API concurrency slot before the simulated-typing hold so
      // other AIs can start generating while this one "types"
      this.deps.onResponseComplete();
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
        this.deps.onResponseComplete();
      }
      emit("ai-generating-stop", aiMeta);
    }
  }
}
