/**
 * Integration OK test for Phind models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: bun run test:phind
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "PHIND",
  displayName: "Phind",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
