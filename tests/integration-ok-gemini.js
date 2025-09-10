/**
 * Integration OK test for Gemini models
 *
 * Gemini service ignores system messages in our implementation, so we put the
 * strict instruction in the user message.
 * Usage: node tests/integration-ok-gemini.js
 */

import dotenv from "dotenv";
import { AIServiceFactory } from "../src/services/AIServiceFactory.js";
import { AI_PROVIDERS } from "../src/config/aiProviders.js";

dotenv.config();

function normalizeOk(text) {
  return (text || "").trim();
}

async function testModel(modelKey) {
  const service = AIServiceFactory.createServiceByName("GEMINI", modelKey);
  await service.initialize();

  const messages = [
    {
      role: "user",
      content:
        "Reply with exactly: OK. Do not add quotes, punctuation, or extra text.",
    },
  ];

  const response = await service.generateResponse(messages);
  const got = normalizeOk(response);
  const pass = got === "OK";
  return { pass, got };
}

async function main() {
  if (!process.env[AI_PROVIDERS.GEMINI.apiKeyEnvVar]) {
    console.error(
      `Missing ${AI_PROVIDERS.GEMINI.apiKeyEnvVar}. Skipping Gemini integration tests.`
    );
    process.exit(0);
  }

  const results = [];
  for (const modelKey of Object.keys(AI_PROVIDERS.GEMINI.models)) {
    try {
      process.stdout.write(`Gemini ${modelKey}: `);
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
    console.error(`\n${failed.length} Gemini model(s) failed.`);
    process.exit(1);
  }

  console.log("\nAll Gemini models returned OK.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

