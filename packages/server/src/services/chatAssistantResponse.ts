import { enhanceAnswerWithLinks } from "@/utils/formatUtils.js";
import type { ChatAssistantService } from "./ChatAssistantService.js";
import type {
  ChatAssistantResponse,
  ChatAssistantResponseOptions,
} from "./chatAssistantTypes.js";

const ASSISTANT_AI_ID = "internal_chat_assistant";

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

  emitTyping(service, options, "ai-generating-start", {
    aiId: ASSISTANT_AI_ID,
    displayName: service.displayName,
    alias: service.alias,
  });

  try {
    if (!service.server) {
      throw new Error("assistant not initialised");
    }

    // A rebuild deletes and refills the collection; answering mid-build
    // would search a half-empty index
    if (service.indexPromise) {
      await service.indexPromise;
    } else if (!service.collectionReady) {
      // Chroma may have come up after the server did - retry in the
      // background; this answer goes ahead without code search if needed
      void service.refreshIndex();
    }

    const result = await service.server.answerQuestion(question, {
      chatHistory: service.prepareChatHistory(options.chatHistory),
      askedBy: options.askedBy,
    });
    console.info(
      `[ChatAssistant] Answered with tools [${result.toolCalls?.join(", ") ?? ""}]`,
    );

    const contexts = result.contexts ?? [];
    return {
      question,
      answer: enhanceAnswerWithLinks(
        result.answer ||
          `I looked into "${question}" but couldn't put an answer together.`,
        contexts,
      ),
      contexts,
      error: result.error ?? null,
    };
  } catch (error) {
    console.error("[ChatAssistant] Failed to answer:", error);
    return {
      question,
      answer:
        "I couldn't look that up just now - something went wrong on my side. Try asking again in a bit.",
      error: error instanceof Error ? error : new Error(String(error)),
    };
  } finally {
    emitTyping(service, options, "ai-generating-stop", {
      aiId: ASSISTANT_AI_ID,
    });
  }
};
