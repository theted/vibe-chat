/**
 * Integration OK test for ByteDance models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: bun run test:bytedance
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "BYTEDANCE",
  displayName: "ByteDance",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
