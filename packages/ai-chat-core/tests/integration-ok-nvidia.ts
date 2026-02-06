/**
 * Integration OK test for NVIDIA models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: bun run test:nvidia
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "NVIDIA",
  displayName: "NVIDIA",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
