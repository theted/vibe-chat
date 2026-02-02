/**
 * Integration OK test for Qwen models
 *
 * Sends a short prompt and asserts a non-empty response.
 * Usage: npm run test:qwen
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "QWEN",
  displayName: "Qwen",
  buildMessages: () => [
    {
      role: "user",
      content: "Respond with the single word OK.",
    },
  ],
  normalizeResponse: (text) => text.trim(),
  isPassingResponse: (text) => text.length > 0,
  initOptions: { validateOnInit: false },
  requestContext: { maxTokens: 64, temperature: 0 },
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
