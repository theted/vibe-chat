/**
 * Integration OK test for Microsoft AI models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: bun run test:microsoft
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "MICROSOFT",
  displayName: "Microsoft AI",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
