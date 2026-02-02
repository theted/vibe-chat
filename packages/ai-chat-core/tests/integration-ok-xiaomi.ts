/**
 * Integration OK test for Xiaomi models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: npm run test:xiaomi
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "XIAOMI",
  displayName: "Xiaomi",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
