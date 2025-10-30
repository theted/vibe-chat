/**
 * Integration OK test for DeepSeek models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: node tests/integration-ok-deepseek.js
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "DEEPSEEK",
  displayName: "DeepSeek",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
