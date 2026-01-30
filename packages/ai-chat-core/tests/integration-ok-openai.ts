/**
 * Integration OK test for OpenAI models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: npm run test:openai
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "OPENAI",
  displayName: "OpenAI",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
