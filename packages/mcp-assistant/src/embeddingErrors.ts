/**
 * Readable errors for a failing embeddings provider (issue #296).
 *
 * The openai SDK only reads an error message nested under `error`. Mistral
 * puts its message at the top level, so a billing failure showed up as
 * "402 status code (no body)" and nobody could tell the account was out of
 * budget. These errors name the provider and the likely cause.
 */

import OpenAI from "openai";

import { EMBEDDING_PROVIDER_ENV } from "./config/embeddingProviders.js";

const CAUSE_BY_STATUS: Record<number, string> = {
  401: "rejected the API key",
  402: "refused the request for billing reasons (out of credits, or no API budget set up)",
  403: "denied access with this API key",
  429: "is rate-limiting or over quota",
};

/** The embeddings provider refused or failed a request; search and indexing can't run. */
export class EmbeddingProviderError extends Error {
  readonly provider: string;
  readonly status?: number;

  constructor(provider: string, status: number | undefined, cause: unknown) {
    const reason =
      (status && CAUSE_BY_STATUS[status]) ??
      (status ? "returned an error" : "could not be reached");
    super(
      `${provider} embeddings ${reason}${status ? ` (HTTP ${status})` : ""}. A maintainer needs to fix the account or set ${EMBEDDING_PROVIDER_ENV} to another provider.`,
      { cause },
    );
    this.name = "EmbeddingProviderError";
    this.provider = provider;
    this.status = status;
  }
}

/** Wrap an SDK failure from `provider` as an EmbeddingProviderError; pass anything else through. */
export const toEmbeddingProviderError = (
  provider: string,
  error: unknown,
): unknown => {
  if (error instanceof OpenAI.APIConnectionError) {
    return new EmbeddingProviderError(provider, undefined, error);
  }
  if (error instanceof OpenAI.APIError) {
    return new EmbeddingProviderError(provider, error.status, error);
  }
  return error;
};
