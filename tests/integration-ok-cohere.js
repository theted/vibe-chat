/**
 * Integration OK test for Cohere models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: node tests/integration-ok-cohere.js
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "COHERE",
  displayName: "Cohere",
  normalizeResponse: (text) => (text || "").trim().replace(/^OK\.$/, "OK"),
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
