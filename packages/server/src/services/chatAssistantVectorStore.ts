import { MCP_ERROR_CODES } from "@ai-chat/mcp-assistant";
import { createWorkspaceIndexer } from "@ai-chat/mcp-assistant/indexer";

import { withTimeout } from "@/utils/promiseUtils.js";
import type { ChatAssistantService } from "./ChatAssistantService.js";
import type { ErrorWithCode, WorkspaceIndexer } from "./chatAssistantTypes.js";

export const buildChatAssistantIndex = async (
  service: ChatAssistantService,
): Promise<void> => {
  await ensureChatAssistantVectorStoreAvailability(service, {
    throwOnUnavailable: true,
  });

  const indexer = createWorkspaceIndexer({
    rootDir: service.projectRoot,
    chromaUrl: service.chromaUrl,
    collectionName: service.collectionName,
  }) as WorkspaceIndexer;

  const result = await indexer.buildEmbeddingStore();
  console.info(
    `[ChatAssistant] Indexed ${result.chunks} chunks into "${result.collectionName}" at ${result.chromaUrl}`,
  );

  await service.server?.ensureCollection();
  service.vectorStoreReachable = true;
  service.collectionReady = true;
  service.vectorStoreError = null;
};

export const ensureChatAssistantVectorStoreAvailability = async (
  service: ChatAssistantService,
  options: {
    throwOnUnavailable?: boolean;
  } = {},
): Promise<{
  reachable: boolean;
  collectionReady: boolean;
  error?: Error;
}> => {
  if (!service.server) {
    service.vectorStoreReachable = false;
    service.collectionReady = false;
    service.vectorStoreError = new Error("assistant not initialised");
    if (options.throwOnUnavailable) {
      throw service.vectorStoreError;
    }
    return {
      reachable: false,
      collectionReady: false,
      error: service.vectorStoreError,
    };
  }

  console.log(
    `[ChatAssistant Debug] Checking vector store availability at ${service.chromaUrl} (timeout: ${service.timeoutMs}ms)`,
  );

  try {
    const timeoutMs = Number.isFinite(service.timeoutMs)
      ? Math.max(0, Number(service.timeoutMs))
      : 0;

    const exists = await withTimeout(
      service.server.ensureCollection(),
      timeoutMs,
      () => {
        const error = new Error(
          `Timed out after ${timeoutMs}ms while contacting the Chroma vector store at ${service.chromaUrl}.`,
        ) as ErrorWithCode;
        error.code = MCP_ERROR_CODES.VECTOR_STORE_UNAVAILABLE;
        return error;
      },
    );
    console.log(
      `[ChatAssistant Debug] ✅ Vector store reachable, collection exists: ${exists}`,
    );
    service.vectorStoreReachable = true;
    service.collectionReady = Boolean(exists);
    service.vectorStoreError = null;
    return {
      reachable: true,
      collectionReady: service.collectionReady,
    };
  } catch (error) {
    console.error("[ChatAssistant Debug] ❌ Vector store check failed:", {
      errorMessage: (error as Error).message,
      errorCode: (error as ErrorWithCode).code,
      chromaUrl: service.chromaUrl,
    });

    if (
      (error as ErrorWithCode)?.code ===
      MCP_ERROR_CODES.VECTOR_STORE_UNAVAILABLE
    ) {
      service.vectorStoreReachable = false;
      service.collectionReady = false;
      service.vectorStoreError = error as Error;
      if (options.throwOnUnavailable) {
        throw error;
      }
      return {
        reachable: false,
        collectionReady: false,
        error,
      };
    }
    throw error;
  }
};
