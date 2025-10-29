/**
 * Integration OK test for Grok models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: node tests/integration-ok-grok.js
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "GROK",
  displayName: "Grok",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
