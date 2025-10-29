/**
 * Integration OK test for Qwen models
 * Usage: node tests/integration-ok-qwen.js
 */

import { executeOkIntegrationTest } from "./helpers/integrationOkTest.js";

executeOkIntegrationTest({
  providerKey: "QWEN",
  providerLabel: "Qwen",
});

