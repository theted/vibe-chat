/**
 * Integration OK test for Baidu models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: bun run test:baidu
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "BAIDU",
  displayName: "Baidu",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
