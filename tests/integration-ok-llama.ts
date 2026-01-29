/**
 * Integration OK test for Llama models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: npm run test:llama
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "LLAMA",
  displayName: "Llama",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
