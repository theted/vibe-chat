import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { AIServiceFactory, AI_PROVIDERS } from "@ai-chat/core";
import type { Message } from "@ai-chat/core";
import type { ServiceInitOptions } from "@/types/index.js";

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

type BuildMessages =
  | Message[]
  | ((modelKey: string, providerKey: string) => Message[]);

type NormalizeResponse = (text: string) => string;
type IsPassingResponse = (text: string, rawResponse: unknown) => boolean;

const baseNormalize: NormalizeResponse = (text) => (text || "").trim();
const baseIsPassingResponse: IsPassingResponse = (text) =>
  text.startsWith("OK") || text.startsWith("Pong");

type ResponseLike = { content?: string };

const unwrapResponse = (response: unknown): string => {
  if (typeof response === "string") {
    return response;
  }

  const typed = response as ResponseLike | null;
  if (typed && typeof typed.content === "string") {
    return typed.content;
  }

  return "";
};

export function defaultMessages(): Message[] {
  return [
    {
      role: "system",
      content:
        "Reply with exactly: OK. Do not add quotes, punctuation, or extra text.",
    },
    { role: "user", content: "Ping" },
  ];
}

export async function runIntegrationOkTest({
  providerKey,
  displayName = providerKey,
  buildMessages = defaultMessages,
  normalizeResponse = baseNormalize,
  isPassingResponse = baseIsPassingResponse,
  initOptions,
  requestContext,
}: {
  providerKey: string;
  displayName?: string;
  buildMessages?: BuildMessages;
  normalizeResponse?: NormalizeResponse;
  isPassingResponse?: IsPassingResponse;
  initOptions?: ServiceInitOptions;
  requestContext?: Record<string, unknown>;
}): Promise<void> {
  const providerConfig = AI_PROVIDERS[providerKey];
  if (!providerConfig) {
    throw new Error(`Unknown provider key: ${providerKey}`);
  }

  const { apiKeyEnvVar, models } = providerConfig;
  loadEnvForKey(apiKeyEnvVar);

  if (!process.env[apiKeyEnvVar]) {
    console.error(
      `Missing ${apiKeyEnvVar}. Skipping ${displayName} integration tests.`,
    );
    process.exit(0);
  }

  const results: Array<{
    modelKey: string;
    pass: boolean;
    got?: string;
    error?: string;
  }> = [];

  for (const modelKey of Object.keys(models)) {
    try {
      process.stdout.write(`${displayName} ${modelKey}: `);
      const service = AIServiceFactory.createServiceByName(
        providerKey,
        modelKey,
      );
      await service.initialize(initOptions);

      const messages =
        typeof buildMessages === "function"
          ? buildMessages(modelKey, providerKey)
          : buildMessages;

      const response = await service.generateResponse(messages, requestContext);
      const got = normalizeResponse(unwrapResponse(response));
      const pass = isPassingResponse(got, response);

      if (pass) {
        console.log("PASS");
        results.push({ modelKey, pass: true });
      } else {
        console.log(`FAIL (got: ${JSON.stringify(got)})`);
        results.push({ modelKey, pass: false, got });
      }
    } catch (err) {
      console.log(`ERROR (${err.message})`);
      results.push({ modelKey, pass: false, error: err.message });
    }
  }

  const failed = results.filter((r) => !r.pass);
  if (failed.length > 0) {
    console.error(`\n${failed.length} ${displayName} model(s) failed.`);
    process.exit(1);
  }

  console.log(`\nAll ${displayName} models passed.`);
}
