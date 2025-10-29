/**
 * Integration OK test for ZhipuAI (ZAI) models
 * Usage: node tests/integration-ok-zai.js
 */

import { executeOkIntegrationTest } from "./helpers/integrationOkTest.js";

executeOkIntegrationTest({
  providerKey: "ZAI",
  providerLabel: "ZhipuAI",
});

