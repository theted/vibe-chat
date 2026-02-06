/**
 * Integration OK test for Grok models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: bun run test:grok
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "GROK",
  displayName: "Grok",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
