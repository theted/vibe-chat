/**
 * Integration OK test for Qwen models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: npm run test:qwen
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "QWEN",
  displayName: "Qwen",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
