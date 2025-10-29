import dotenv from "dotenv";
import { AIServiceFactory, AI_PROVIDERS } from "@ai-chat/core";

dotenv.config();

const OK_INSTRUCTION = "Reply with exactly: OK. Do not add quotes, punctuation, or extra text.";

const defaultNormalizeOk = (text) => (text || "").trim();

const defaultMessagesBuilder = ({ instruction }) => [
  { role: "system", content: instruction },
  { role: "user", content: "Ping" },
];

export async function runOkIntegrationTest({
  providerKey,
  providerLabel = providerKey,
  normalizeOk = defaultNormalizeOk,
  buildMessages = defaultMessagesBuilder,
} = {}) {
  if (!providerKey) {
    throw new Error("providerKey is required");
  }

  const provider = AI_PROVIDERS[providerKey];
  if (!provider) {
    throw new Error(`Unknown provider key: ${providerKey}`);
  }

  const apiKeyVar = provider.apiKeyEnvVar;
  if (!process.env[apiKeyVar]) {
    console.error(
      `Missing ${apiKeyVar}. Skipping ${providerLabel} integration tests.`
    );
    return { status: "missing-env", results: [] };
  }

  const results = [];

  for (const modelKey of Object.keys(provider.models)) {
    try {
      process.stdout.write(`${providerLabel} ${modelKey}: `);
      const service = AIServiceFactory.createServiceByName(
        providerKey,
        modelKey
      );
      await service.initialize();

      const messages = buildMessages({
        providerKey,
        providerLabel,
        modelKey,
        instruction: OK_INSTRUCTION,
      });

      const response = await service.generateResponse(messages);
      const got = normalizeOk(response);
      const pass = got === "OK";

      if (pass) {
        console.log("PASS");
      } else {
        console.log(`FAIL (got: ${JSON.stringify(got)})`);
      }

      results.push({ modelKey, pass, got });
    } catch (err) {
      console.log(`ERROR (${err.message})`);
      results.push({ modelKey, pass: false, error: err.message });
    }
  }

  const failed = results.filter((r) => !r.pass);

  if (failed.length > 0) {
    console.error(`\n${failed.length} ${providerLabel} model(s) failed.`);
    return { status: "failed", results, failed };
  }

  console.log(`\nAll ${providerLabel} models returned OK.`);
  return { status: "passed", results, failed: [] };
}

export async function executeOkIntegrationTest(options) {
  try {
    const result = await runOkIntegrationTest(options);
    if (result.status === "failed") {
      process.exit(1);
    }
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
