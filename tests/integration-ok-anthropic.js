/**
 * Integration OK test for Anthropic models
 * Usage: node tests/integration-ok-anthropic.js
 */

import { executeOkIntegrationTest } from "./helpers/integrationOkTest.js";

executeOkIntegrationTest({
  providerKey: "ANTHROPIC",
  providerLabel: "Anthropic",
});

