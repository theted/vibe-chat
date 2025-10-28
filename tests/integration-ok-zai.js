/**
 * Integration OK test for Z.ai models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: node tests/integration-ok-zai.js
 */

import dotenv from "dotenv";
import { AIServiceFactory, AI_PROVIDERS } from "@ai-chat/core";

dotenv.config();

function normalizeOk(text) {
  return (text || "").trim();
}

async function testModel(modelKey) {
  const service = AIServiceFactory.createServiceByName("ZAI", modelKey);
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
  if (!process.env[AI_PROVIDERS.ZAI.apiKeyEnvVar]) {
    console.error(
      `Missing ${AI_PROVIDERS.ZAI.apiKeyEnvVar}. Skipping Z.ai integration tests.`
    );
    process.exit(0);
  }

  const results = [];
  for (const modelKey of Object.keys(AI_PROVIDERS.ZAI.models)) {
    try {
      process.stdout.write(`Z.ai ${modelKey}: `);
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
    console.error(`\n${failed.length} Z.ai model(s) failed.`);
    process.exit(1);
  }

  console.log("\nAll Z.ai models returned OK.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
