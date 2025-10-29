/**
 * Integration OK test for Deepseek models
 * Usage: node tests/integration-ok-deepseek.js
 */

import { executeOkIntegrationTest } from "./helpers/integrationOkTest.js";

executeOkIntegrationTest({
  providerKey: "DEEPSEEK",
  providerLabel: "Deepseek",
});

