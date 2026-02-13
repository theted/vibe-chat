/**
 * Integration OK test for 01.AI models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: bun run test:01ai
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "ZEROONEAI",
  displayName: "01.AI",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
