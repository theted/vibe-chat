/**
 * Integration OK test for Grok models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: node tests/integration-ok-grok.js
 */

import dotenv from "dotenv";
import { AIServiceFactory } from "../src/services/AIServiceFactory.js";
import { AI_PROVIDERS } from "../src/config/aiProviders.js";

dotenv.config();

function normalizeOk(text) {
  return (text || "").trim();
}

async function testGrokModel(modelKey) {
  const service = AIServiceFactory.createServiceByName("GROK", modelKey);
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
  if (!process.env[AI_PROVIDERS.GROK.apiKeyEnvVar]) {
    console.error(
      `Missing ${AI_PROVIDERS.GROK.apiKeyEnvVar}. Skipping Grok integration tests.`
    );
    process.exit(0);
  }

  const results = [];
  for (const modelKey of Object.keys(AI_PROVIDERS.GROK.models)) {
    try {
      process.stdout.write(`Grok ${modelKey}: `);
      const { pass, got } = await testGrokModel(modelKey);
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
    console.error(`\n${failed.length} Grok model(s) failed.`);
    process.exit(1);
  }

  console.log("\nAll Grok models returned OK.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

