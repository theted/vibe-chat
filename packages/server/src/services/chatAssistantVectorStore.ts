import { MCP_ERROR_CODES } from "@ai-chat/mcp-assistant";
import {
  createWorkspaceIndexer,
  type IndexFreshness,
} from "@ai-chat/mcp-assistant/indexer";

import { withTimeout } from "@/utils/promiseUtils.js";
import type { ChatAssistantService } from "./ChatAssistantService.js";
import type { ErrorWithCode } from "./chatAssistantTypes.js";

const createIndexer = (service: ChatAssistantService) =>
  createWorkspaceIndexer({
    rootDir: service.projectRoot,
    chromaUrl: service.chromaUrl,
    collectionName: service.collectionName,
  });

/**
 * Whether the Chroma index is missing, stale (code changed since it was
 * built) or current. Throws E_VECTOR_STORE_UNAVAILABLE when Chroma doesn't
 * answer within the service timeout.
 */
export const checkChatAssistantIndex = async (
  service: ChatAssistantService,
): Promise<IndexFreshness> => {
  try {
    const freshness = await withTimeout(
      createIndexer(service).checkFreshness(),
      service.timeoutMs,
      () => {
        const error: ErrorWithCode = new Error(
          `Timed out after ${service.timeoutMs}ms while contacting the Chroma vector store at ${service.chromaUrl}.`,
        );
        error.code = MCP_ERROR_CODES.VECTOR_STORE_UNAVAILABLE;
        return error;
      },
    );
    service.vectorStoreReachable = true;
    service.collectionReady = freshness !== "missing";
    return freshness;
  } catch (error) {
    if (
      (error as ErrorWithCode)?.code ===
      MCP_ERROR_CODES.VECTOR_STORE_UNAVAILABLE
    ) {
      service.vectorStoreReachable = false;
      service.collectionReady = false;
    }
    throw error;
  }
};

export const buildChatAssistantIndex = async (
  service: ChatAssistantService,
): Promise<void> => {
  const result = await createIndexer(service).buildEmbeddingStore();
  console.info(
    `[ChatAssistant] Indexed ${result.chunks} chunks into "${result.collectionName}" at ${result.chromaUrl}`,
  );
  service.vectorStoreReachable = true;
  service.collectionReady = true;
};
