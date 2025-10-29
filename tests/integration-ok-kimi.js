/**
 * Integration OK test for Kimi models
 * Usage: node tests/integration-ok-kimi.js
 */

import { executeOkIntegrationTest } from "./helpers/integrationOkTest.js";

executeOkIntegrationTest({
  providerKey: "KIMI",
  providerLabel: "Kimi",
});

