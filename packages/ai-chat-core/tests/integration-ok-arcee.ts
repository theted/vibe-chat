/**
 * Integration OK test for Arcee AI models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: bun run test:arcee
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "ARCEE",
  displayName: "Arcee AI",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
