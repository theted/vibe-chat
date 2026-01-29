/**
 * Integration OK test for Anthropic models
 * Usage: npm run test:anthropic
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "ANTHROPIC",
  displayName: "Anthropic",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
