/**
 * Integration OK test for Nous Research models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: bun run test:nous
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "NOUS",
  displayName: "Nous Research",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
