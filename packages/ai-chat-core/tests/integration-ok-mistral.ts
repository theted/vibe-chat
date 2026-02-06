/**
 * Integration OK test for Mistral models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: bun run test:mistral
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "MISTRAL",
  displayName: "Mistral",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
