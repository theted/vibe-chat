/**
 * Integration OK test for Cohere models
 * Usage: node tests/integration-ok-cohere.js
 */

import { executeOkIntegrationTest } from "./helpers/integrationOkTest.js";

const normalizeOk = (text) => (text || "").trim().replace(/^OK\.$/, "OK");

executeOkIntegrationTest({
  providerKey: "COHERE",
  providerLabel: "Cohere",
  normalizeOk,
});

