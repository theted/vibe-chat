import OpenAI from "openai";

import {
  DEFAULT_EMBEDDING_PROVIDER,
  EMBEDDING_PROVIDER_ENV,
  EMBEDDING_PROVIDERS,
  type EmbeddingProviderName,
} from "./config/embeddingProviders.js";

export type Embedder = {
  /** "<provider>/<model>" - stored with the index so a provider switch forces a rebuild */
  id: string;
  embed: (texts: string[]) => Promise<number[][]>;
};

const isProviderName = (value: string): value is EmbeddingProviderName =>
  value in EMBEDDING_PROVIDERS;

export const resolveEmbeddingProvider = (
  requested = process.env[EMBEDDING_PROVIDER_ENV],
): EmbeddingProviderName => {
  const name = requested?.trim().toLowerCase() || DEFAULT_EMBEDDING_PROVIDER;
  if (!isProviderName(name)) {
    const known = Object.keys(EMBEDDING_PROVIDERS).join(", ");
    throw new Error(
      `Unknown ${EMBEDDING_PROVIDER_ENV} "${name}". Use one of: ${known}.`,
    );
  }
  return name;
};

export const createEmbedder = (
  providerName: EmbeddingProviderName = resolveEmbeddingProvider(),
): Embedder => {
  const provider = EMBEDDING_PROVIDERS[providerName];
  const apiKey = process.env[provider.apiKeyEnv];
  if (!apiKey) {
    throw new Error(
      `${provider.apiKeyEnv} is required for ${providerName} embeddings (set ${EMBEDDING_PROVIDER_ENV} to pick another provider).`,
    );
  }

  const client = new OpenAI({
    apiKey,
    baseURL: "baseURL" in provider ? provider.baseURL : undefined,
  });

  return {
    id: `${providerName}/${provider.model}`,
    embed: async (texts) => {
      const response = await client.embeddings.create({
        model: provider.model,
        input: texts,
        // Must be explicit: unset, the SDK asks for base64 and decodes it
        // itself. Mistral ignores that and sends floats, which the SDK then
        // "decodes" into short all-zero vectors without any error.
        encoding_format: "float",
      });
      // Providers may reorder; `index` maps each vector back to its input
      const vectors = [...response.data]
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);
      if (vectors.some((vector) => !vector.some((value) => value !== 0))) {
        throw new Error(
          `${providerName} returned an all-zero embedding; refusing to index or search with it.`,
        );
      }
      return vectors;
    },
  };
};
