/**
 * Integration OK test for Perplexity models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: npm run test:perplexity
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "PERPLEXITY",
  displayName: "Perplexity",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
