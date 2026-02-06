/**
 * Integration OK test for Kimi models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: bun run test:kimi
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "KIMI",
  displayName: "Kimi",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
