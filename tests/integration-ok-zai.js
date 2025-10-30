/**
 * Integration OK test for Z.ai models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: node tests/integration-ok-zai.js
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "ZAI",
  displayName: "Z.ai",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
