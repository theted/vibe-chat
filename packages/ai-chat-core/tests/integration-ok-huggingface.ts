/**
 * Integration OK test for Hugging Face models
 *
 * Sends a strict system instruction to return exactly "OK" and asserts it.
 * Usage: npm run test:huggingface
 */

import { runIntegrationOkTest } from "./helpers/runIntegrationOkTest.js";

runIntegrationOkTest({
  providerKey: "HUGGINGFACE",
  displayName: "Hugging Face",
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
