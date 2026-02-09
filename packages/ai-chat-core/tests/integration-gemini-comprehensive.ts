/**
 * Comprehensive integration test for Gemini models
 *
 * Usage: bun run test:gemini
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

const textToSummarize =
  "The quick brown fox jumps over the lazy dog. This sentence is famous because it contains all the letters of the English alphabet. It is often used for testing typewriters and computer keyboards.";

runIntegrationOkTest({
  providerKey: "GEMINI",
  displayName: "Gemini (Comprehensive)",
  buildMessages: () => [
    {
      role: "user",
      content: `Summarize the following text in one sentence: "${textToSummarize}"`,
    },
  ],
  isPassingResponse: (text) => {
    const lower = text.toLowerCase();
    return (
      lower.includes("fox") &&
      lower.includes("dog") &&
      lower.includes("alphabet")
    );
  },
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
