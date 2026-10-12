import {
  ChromaClient,
  ChromaConnectionError,
  ChromaNotFoundError,
  type Collection,
} from "chromadb";

import {
  FINGERPRINT_METADATA_KEY,
  VECTOR_STORE_UNAVAILABLE_CODE,
} from "./constants.js";

export type ErrorWithCode = Error & { code?: string; cause?: unknown };

const DEFAULT_HTTP_PORT = 80;
const DEFAULT_HTTPS_PORT = 443;

/** chromadb 3.x takes host/port/ssl; the app is configured with one URL. */
export const createChromaClient = (chromaUrl: string): ChromaClient => {
  const url = new URL(chromaUrl);
  const ssl = url.protocol === "https:";
  return new ChromaClient({
    host: url.hostname,
    port: url.port
      ? Number(url.port)
      : ssl
        ? DEFAULT_HTTPS_PORT
        : DEFAULT_HTTP_PORT,
    ssl,
  });
};

export const isMissingCollection = (error: unknown): boolean =>
  error instanceof ChromaNotFoundError;

export const isChromaUnavailable = (error: unknown): boolean =>
  error instanceof ChromaConnectionError;

export const vectorStoreUnavailableError = (
  chromaUrl: string,
  cause: unknown,
): ErrorWithCode => {
  const error: ErrorWithCode = new Error(
    `Unable to reach Chroma vector store at ${chromaUrl}. Ensure the service is running and reachable.`,
  );
  error.code = VECTOR_STORE_UNAVAILABLE_CODE;
  error.cause = cause;
  return error;
};

/** Rethrows connection failures with the app's stable error code. */
export const rethrowChromaError = (
  chromaUrl: string,
  error: unknown,
): never => {
  if (isChromaUnavailable(error)) {
    throw vectorStoreUnavailableError(chromaUrl, error);
  }
  throw error;
};

/** Returns null when the collection doesn't exist yet. */
export const getCollectionOrNull = async (
  client: ChromaClient,
  chromaUrl: string,
  name: string,
): Promise<Collection | null> => {
  try {
    return await client.getCollection({ name });
  } catch (error) {
    if (isMissingCollection(error)) return null;
    return rethrowChromaError(chromaUrl, error);
  }
};

export const readFingerprint = (collection: Collection): string | null => {
  const value = collection.metadata?.[FINGERPRINT_METADATA_KEY];
  return typeof value === "string" ? value : null;
};
