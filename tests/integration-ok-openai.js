/**
 * Integration OK test for OpenAI models
 * Usage: node tests/integration-ok-openai.js
 */

import { executeOkIntegrationTest } from "./helpers/integrationOkTest.js";

executeOkIntegrationTest({
  providerKey: "OPENAI",
  providerLabel: "OpenAI",
});

