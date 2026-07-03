import { enhanceAnswerWithLinks } from "@/utils/formatUtils.js";
import type { ChatAssistantService } from "./ChatAssistantService.js";
import type {
  ChatAssistantResponse,
  ChatAssistantResponseOptions,
} from "./chatAssistantTypes.js";

const emitTyping = (
  service: ChatAssistantService,
  options: ChatAssistantResponseOptions,
  event: string,
  payload: Record<string, unknown>,
): void => {
  const { emitter = null, roomId = null } = options;
  if (!emitter) {
    return;
  }

  const target = roomId ? emitter.to(roomId) : emitter;
  target.emit(event, { roomId, ...payload });
};

export const createChatAssistantResponse = async (
  service: ChatAssistantService,
  content: string,
  options: ChatAssistantResponseOptions = {},
): Promise<ChatAssistantResponse | null> => {
  const question = service.extractQuestion(content);
  if (!question) {
    return null;
  }

  console.info(`[ChatAssistant] Generating answer for question: "${question}"`);

  const historyContext = service.prepareChatHistory(options.chatHistory);

  try {
    if (!service.server) {
      throw new Error("assistant not initialised");
    }

    if (service.indexPromise) {
      try {
        await service.indexPromise;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[ChatAssistant] Background indexing failed: ${message}`);
      }
    }

    emitTyping(service, options, "ai-generating-start", {
      aiId: "internal_chat_assistant",
      displayName: service.displayName,
      alias: service.alias,
    });

    await service.ensureVectorStoreAvailability();
    if (service.vectorStoreReachable === false) {
      emitTyping(service, options, "ai-generating-stop", {
        aiId: "internal_chat_assistant",
      });
      return {
        question,
        answer: [
          "I can't reach the shared knowledge index right now.",
          `Check that the Chroma service is running at ${service.chromaUrl} and try re-indexing with \`bun run build && bun dist/scripts/index-mcp-chat.js\`.`,
        ].join(" "),
      };
    }

    let result = await service.server.answerQuestion(question, {
      chatHistory: historyContext,
    });

    if (
      service.autoIndex &&
      (!result.contexts || result.contexts.length === 0) &&
      !service.indexPromise &&
      service.vectorStoreReachable
    ) {
      service.indexPromise = service
        .buildIndex()
        .catch((error: Error) => {
          const message =
            error instanceof Error ? error.message : String(error);
          console.warn(`[ChatAssistant] Auto-index failed: ${message}`);
          return null;
        })
        .finally(() => {
          service.indexPromise = null;
        });

      try {
        await service.indexPromise;
        await service.ensureVectorStoreAvailability();
        if (service.vectorStoreReachable) {
          result = await service.server.answerQuestion(question, {
            chatHistory: historyContext,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(
          `[ChatAssistant] Failed to rebuild vector index: ${message}`,
        );
      }
    }

    emitTyping(service, options, "ai-generating-stop", {
      aiId: "internal_chat_assistant",
    });

    const answer =
      result.answer ||
      `I looked for "${question}" but did not find any relevant code snippets.`;
    const contexts = result.contexts || [];

    return {
      question,
      answer: enhanceAnswerWithLinks(answer, contexts),
      contexts,
      error: result.error || null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emitTyping(service, options, "ai-generating-stop", {
      aiId: "internal_chat_assistant",
    });
    return {
      question,
      answer: `I tried to look up "${question}" but ran into an issue (${message}).`,
      error,
    };
  }
};
