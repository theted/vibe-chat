/**
 * Integration OK test for Meta (Llama) models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: bun run test:llama
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "LLAMA",
  displayName: "Meta",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
