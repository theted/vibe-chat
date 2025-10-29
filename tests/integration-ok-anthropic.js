/**
 * Integration OK test for Anthropic models
 * Usage: node tests/integration-ok-anthropic.js
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "ANTHROPIC",
  displayName: "Anthropic",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
