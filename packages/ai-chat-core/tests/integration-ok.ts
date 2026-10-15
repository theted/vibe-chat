/**
 * Live provider smoke test: pings every active model through its real API
 * and reports which ones answer. Costs a few tokens per model.
 *
 * Usage: bun run test:live [PROVIDER ...] [--all]
 *   no providers   every provider whose API key is set
 *   --all          include parked (inactive) models too
 */

import { AI_PROVIDERS, runWithConcurrencyLimit } from "@ai-chat/core";
import {
  listModelChecks,
  runIntegrationOkTest,
  type ModelCheckResult,
} from "./helpers/runIntegrationOkTest.js";

// Same parallelism as the server's background health checks
const LIVE_TEST_CONCURRENCY = 8;

const args = process.argv.slice(2);
const includeInactive = args.includes("--all");
const requested = args
  .filter((arg) => !arg.startsWith("--"))
  .map((arg) => arg.toUpperCase());

const unknown = requested.filter((key) => !(key in AI_PROVIDERS));
if (unknown.length > 0) {
  console.error(
    `Unknown provider key(s): ${unknown.join(", ")}\nKnown: ${Object.keys(AI_PROVIDERS).join(", ")}`,
  );
  process.exit(1);
}

const providerKeys =
  requested.length > 0 ? requested : Object.keys(AI_PROVIDERS);
const checks = providerKeys.flatMap((providerKey) => {
  const { checks: providerChecks, missingKey } = listModelChecks(providerKey, {
    includeInactive,
  });
  if (missingKey) {
    console.log(`${providerKey}: skipped, ${missingKey} is not set`);
  }
  return providerChecks;
});

const results: ModelCheckResult[] = [];
await runWithConcurrencyLimit(
  checks.map((check) => async () => {
    const result = await runIntegrationOkTest(check);
    results.push(result);
    const label = result.pass ? "PASS" : "FAIL";
    console.log(
      `${label} ${result.providerKey}_${result.modelKey}: ${result.detail}`,
    );
  }),
  LIVE_TEST_CONCURRENCY,
);

const failed = results.filter(({ pass }) => !pass);
console.log(
  `\n${results.length - failed.length} passed, ${failed.length} failed`,
);
if (failed.length > 0) {
  console.log(
    `Failed: ${failed.map((r) => `${r.providerKey}_${r.modelKey}`).join(", ")}`,
  );
  process.exit(1);
}
