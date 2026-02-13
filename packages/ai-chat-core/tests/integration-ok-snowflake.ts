/**
 * Integration OK test for Snowflake models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: bun run test:snowflake
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "SNOWFLAKE",
  displayName: "Snowflake",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
