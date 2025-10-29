/**
 * Integration OK test for Mistral models
 * Usage: node tests/integration-ok-mistral.js
 */

import { executeOkIntegrationTest } from "./helpers/integrationOkTest.js";

executeOkIntegrationTest({
  providerKey: "MISTRAL",
  providerLabel: "Mistral",
});

