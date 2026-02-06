/**
 * Integration OK test for MiniMax models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: bun run test:minimax
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "MINIMAX",
  displayName: "MiniMax",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
