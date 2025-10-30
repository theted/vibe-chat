import dotenv from "dotenv";
import { AIServiceFactory, AI_PROVIDERS } from "@ai-chat/core";

dotenv.config();

function baseNormalize(text) {
  return (text || "").trim();
}

export function defaultMessages() {
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
}) {
  const providerConfig = AI_PROVIDERS[providerKey];
  if (!providerConfig) {
    throw new Error(`Unknown provider key: ${providerKey}`);
  }

  const { apiKeyEnvVar, models } = providerConfig;

  if (!process.env[apiKeyEnvVar]) {
    console.error(
      `Missing ${apiKeyEnvVar}. Skipping ${displayName} integration tests.`
    );
    process.exit(0);
  }

  const results = [];

  for (const modelKey of Object.keys(models)) {
    try {
      process.stdout.write(`${displayName} ${modelKey}: `);
      const service = AIServiceFactory.createServiceByName(
        providerKey,
        modelKey
      );
      await service.initialize();

      const messages =
        typeof buildMessages === "function"
          ? buildMessages(modelKey, providerKey)
          : buildMessages;

      const response = await service.generateResponse(messages);
      const got = normalizeResponse(response);
      const pass = got === "OK";

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

  console.log(`\nAll ${displayName} models returned OK.`);
}
