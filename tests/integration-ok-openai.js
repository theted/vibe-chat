/**
 * Integration OK test for OpenAI models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: node tests/integration-ok-openai.js
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "OPENAI",
  displayName: "OpenAI",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
