/**
 * Integration OK test for StepFun models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: bun run test:stepfun
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "STEPFUN",
  displayName: "StepFun",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
