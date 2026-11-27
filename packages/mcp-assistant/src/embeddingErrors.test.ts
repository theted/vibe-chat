import { describe, expect, it } from "bun:test";
import OpenAI from "openai";

import {
  EmbeddingProviderError,
  toEmbeddingProviderError,
} from "./embeddingErrors.js";

// Mistral's real 402 body: message at the top level, which the SDK drops
const mistralBillingBody = {
  object: "error",
  message: "You need a subscription to access this API.",
  type: "billing_no_api_budget_configured",
};

const apiError = (status: number) =>
  OpenAI.APIError.generate(
    status,
    mistralBillingBody,
    undefined,
    new Headers() as never,
  );

describe("toEmbeddingProviderError", () => {
  it("names billing as the cause of a 402 instead of 'no body'", () => {
    const sdkError = apiError(402);
    expect(sdkError.message).toBe("402 status code (no body)");

    const error = toEmbeddingProviderError("mistral", sdkError);

    expect(error).toBeInstanceOf(EmbeddingProviderError);
    expect((error as EmbeddingProviderError).status).toBe(402);
    expect((error as Error).message).toContain(
      "mistral embeddings refused the request for billing reasons",
    );
    expect((error as Error).message).toContain("(HTTP 402)");
    expect((error as Error).message).toContain("CHAT_ASSISTANT_EMBEDDINGS");
  });

  it.each([
    [401, "rejected the API key"],
    [429, "is rate-limiting or over quota"],
    [500, "returned an error"],
  ])("describes HTTP %p", (status, reason) => {
    const error = toEmbeddingProviderError("openai", apiError(status));
    expect((error as Error).message).toContain(`openai embeddings ${reason}`);
  });

  it("reports an unreachable provider", () => {
    const error = toEmbeddingProviderError(
      "cohere",
      new OpenAI.APIConnectionError({ message: "fetch failed" }),
    );
    expect((error as Error).message).toContain(
      "cohere embeddings could not be reached.",
    );
  });

  it("passes other errors through untouched", () => {
    const other = new Error("all-zero embedding");
    expect(toEmbeddingProviderError("mistral", other)).toBe(other);
  });
});
