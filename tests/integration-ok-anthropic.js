/**
 * Integration OK test for Anthropic models
 * Usage: node tests/integration-ok-anthropic.js
 */

import dotenv from "dotenv";
import { AIServiceFactory, AI_PROVIDERS } from "@ai-chat/core";

dotenv.config();

function normalizeOk(text) {
  return (text || "").trim();
}

async function testModel(modelKey) {
  const service = AIServiceFactory.createServiceByName("ANTHROPIC", modelKey);
  await service.initialize();

  const messages = [
    {
      role: "system",
      content:
        "Reply with exactly: OK. Do not add quotes, punctuation, or extra text.",
    },
    { role: "user", content: "Ping" },
  ];

  const response = await service.generateResponse(messages);
  const got = normalizeOk(response);
  const pass = got === "OK";
  return { pass, got };
}

async function main() {
  if (!process.env[AI_PROVIDERS.ANTHROPIC.apiKeyEnvVar]) {
    console.error(
      `Missing ${AI_PROVIDERS.ANTHROPIC.apiKeyEnvVar}. Skipping Anthropic integration tests.`
    );
    process.exit(0);
  }

  const results = [];
  for (const modelKey of Object.keys(AI_PROVIDERS.ANTHROPIC.models)) {
    try {
      process.stdout.write(`Anthropic ${modelKey}: `);
      const { pass, got } = await testModel(modelKey);
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
    console.error(`\n${failed.length} Anthropic model(s) failed.`);
    process.exit(1);
  }

  console.log("\nAll Anthropic models returned OK.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
