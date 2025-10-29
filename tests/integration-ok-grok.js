/**
 * Integration OK test for Grok models
 * Usage: node tests/integration-ok-grok.js
 */

import { executeOkIntegrationTest } from "./helpers/integrationOkTest.js";

executeOkIntegrationTest({
  providerKey: "GROK",
  providerLabel: "Grok",
});

