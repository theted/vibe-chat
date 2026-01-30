/**
 * Integration OK test for Gemini models
 *
 * Gemini service ignores system messages in our implementation, so we put the
 * strict instruction in the user message.
 * Usage: npm run test:gemini
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "GEMINI",
  displayName: "Gemini",
  buildMessages: () => [
    {
      role: "user",
      content:
        "Reply with exactly: OK. Do not add quotes, punctuation, or extra text.",
    },
  ],
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
