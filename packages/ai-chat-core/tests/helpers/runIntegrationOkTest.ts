import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import {
  AIServiceFactory,
  AI_PROVIDERS,
  getActiveParticipants,
} from "@ai-chat/core";
import type { Message } from "@ai-chat/core";

const loadEnvForKey = (envVar: string): void => {
  if (process.env[envVar]) {
    return;
  }

  let currentDir = process.cwd();
  while (true) {
    const envPath = path.join(currentDir, ".env");
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      if (process.env[envVar]) {
        return;
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return;
    }
    currentDir = parentDir;
  }
};

const PING_MESSAGES: Message[] = [
  {
    role: "system",
    content:
      "Reply with exactly: OK. Do not add quotes, punctuation, or extra text.",
  },
  { role: "user", content: "Ping" },
];

// Reasoning and search models wrap the answer ("OK.", "**OK**", citations),
// so any non-empty reply passes; the reply is printed for a human to judge
const MAX_SHOWN_REPLY_CHARS = 60;

export type ModelCheck = {
  providerKey: string;
  modelKey: string;
};

export type ModelCheckResult = ModelCheck & {
  pass: boolean;
  detail: string;
};

/**
 * Models to check for a provider: active participants only unless
 * includeInactive, and none when the provider's API key is missing.
 */
export const listModelChecks = (
  providerKey: string,
  { includeInactive = false } = {},
): { checks: ModelCheck[]; missingKey?: string } => {
  const provider = AI_PROVIDERS[providerKey];
  if (!provider) {
    throw new Error(`Unknown provider key: ${providerKey}`);
  }

  loadEnvForKey(provider.apiKeyEnvVar);
  if (!process.env[provider.apiKeyEnvVar]) {
    return { checks: [], missingKey: provider.apiKeyEnvVar };
  }

  const activeIds = new Set(getActiveParticipants().map(({ id }) => id));
  const checks = Object.keys(provider.models)
    .filter(
      (modelKey) =>
        includeInactive || activeIds.has(`${providerKey}_${modelKey}`),
    )
    .map((modelKey) => ({ providerKey, modelKey }));
  return { checks };
};

/** Send one model a ping through its real API. */
export const runIntegrationOkTest = async ({
  providerKey,
  modelKey,
}: ModelCheck): Promise<ModelCheckResult> => {
  try {
    const service = AIServiceFactory.createServiceByName(providerKey, modelKey);
    await service.initialize({ validateOnInit: false });
    const response = await service.generateResponse(PING_MESSAGES);
    const reply = (response.content || "").trim();
    return reply
      ? {
          providerKey,
          modelKey,
          pass: true,
          detail: JSON.stringify(reply.slice(0, MAX_SHOWN_REPLY_CHARS)),
        }
      : { providerKey, modelKey, pass: false, detail: "empty reply" };
  } catch (error) {
    return {
      providerKey,
      modelKey,
      pass: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
};
