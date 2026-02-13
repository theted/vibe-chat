/**
 * Integration OK test for Databricks models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: bun run test:databricks
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "DATABRICKS",
  displayName: "Databricks",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
