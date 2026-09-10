/**
 * AI model registry validator.
 *
 * A model must be registered consistently in four places or it silently
 * misbehaves at runtime:
 *
 *   1. providers/<p>.ts        -> AI_PROVIDERS[P].models[KEY]   (the API id)
 *   2. participants.ts         -> DEFAULT_AI_PARTICIPANTS       (UI identity + status)
 *   3. aiModels.ts             -> ENABLED_AI_MODELS             (server opt-in)
 *   4. defaults.ts             -> DEFAULT_MODELS                (per-provider fallback)
 *
 * displayInfo.ts is derived from participants.ts, so it is not a fifth source.
 *
 * A mismatch never throws — it just means a model quietly never loads, or an
 * @mention resolves to the wrong bot. This script surfaces those.
 *
 * Usage:
 *   bun scripts/validate-ai-models.ts          # static cross-reference
 *   bun scripts/validate-ai-models.ts --live   # also verify OpenRouter-backed
 *                                              # ids still exist in the live catalog
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { AI_PROVIDERS } from "../packages/ai-chat-core/src/config/aiProviders/index.js";
import { DEFAULT_MODELS } from "../packages/ai-chat-core/src/config/aiProviders/defaults.js";
import { DEFAULT_AI_PARTICIPANTS } from "../packages/ai-configs/src/participants.js";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const AI_MODELS_PATH = "packages/server/src/config/aiModels.ts";
const OPENROUTER_CATALOG_URL = "https://openrouter.ai/api/v1/models";
const OPENROUTER_ENV_VAR = "OPENROUTER_API_KEY";

type Problem = { severity: "error" | "warn"; message: string };

const problems: Problem[] = [];
const err = (message: string) => problems.push({ severity: "error", message });
const warn = (message: string) => problems.push({ severity: "warn", message });

/**
 * aiModels.ts imports from the built @ai-chat/core package, so importing it
 * here would require a full workspace install. Both values we need are plain
 * literals, so read them out of the source instead.
 */
const readAiModelsSource = () => {
  const source = readFileSync(resolve(REPO_ROOT, AI_MODELS_PATH), "utf8");

  // ENABLED_AI_MODELS is derived from active participants minus the
  // DISABLED_AI_MODELS env var (a server-only override), so mirror that here
  // rather than parsing a literal list.
  const disabled = new Set(
    (process.env.DISABLED_AI_MODELS ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
  const enabled = DEFAULT_AI_PARTICIPANTS.filter(
    (p) => p.status === "active" && !disabled.has(p.id),
  ).map((p) => p.id);

  const envBlock = source.match(
    /export const PROVIDER_ENV_VARS[^=]*=\s*\{([\s\S]*?)\n\};/,
  );
  if (!envBlock) throw new Error("could not locate PROVIDER_ENV_VARS");
  const envVars = Object.fromEntries(
    [...envBlock[1].matchAll(/^\s*([A-Z0-9_]+):\s*"([^"]+)",/gm)].map((m) => [
      m[1],
      m[2],
    ]),
  );

  return { enabled, envVars };
};

const { enabled: ENABLED_AI_MODELS, envVars: PROVIDER_ENV_VARS } =
  readAiModelsSource();

const enabledSet = new Set(ENABLED_AI_MODELS);
const participantsById = new Map(DEFAULT_AI_PARTICIPANTS.map((p) => [p.id, p]));

/** Every provider_model pair that actually exists in provider config. */
const declaredIds = new Set<string>();
/** apiId -> list of participant ids serving it, to catch accidental twins. */
const apiIdOwners = new Map<string, string[]>();

for (const [providerKey, provider] of Object.entries(AI_PROVIDERS)) {
  for (const [modelKey, model] of Object.entries(provider.models)) {
    const id = `${providerKey}_${modelKey}`;
    declaredIds.add(id);
    const apiId = (model as { id: string }).id;
    apiIdOwners.set(apiId, [...(apiIdOwners.get(apiId) ?? []), id]);
  }
}

// --- 1. ENABLED_AI_MODELS entries that point at nothing ----------------------
for (const id of ENABLED_AI_MODELS) {
  if (!declaredIds.has(id)) {
    err(
      `ENABLED_AI_MODELS lists "${id}" but no such model exists in provider config (silently ignored at startup)`,
    );
  }
}

const duplicateEnabled = ENABLED_AI_MODELS.filter(
  (id, i) => ENABLED_AI_MODELS.indexOf(id) !== i,
);
for (const id of new Set(duplicateEnabled)) {
  warn(`ENABLED_AI_MODELS lists "${id}" more than once`);
}

// --- 2. provider models with no participant entry ---------------------------
for (const id of declaredIds) {
  if (!participantsById.has(id)) {
    warn(
      `model "${id}" exists in provider config but has no participants.ts entry (it can never appear in the UI)`,
    );
  }
}

// --- 3. participants pointing at models that no longer exist ----------------
for (const participant of DEFAULT_AI_PARTICIPANTS) {
  if (!declaredIds.has(participant.id)) {
    err(
      `participant "${participant.id}" has no matching model in provider config (dangling UI entry)`,
    );
  }
}

// --- 4. active participants the server never initializes --------------------
for (const participant of DEFAULT_AI_PARTICIPANTS) {
  if (
    participant.status === "active" &&
    declaredIds.has(participant.id) &&
    !enabledSet.has(participant.id)
  ) {
    err(
      `participant "${participant.id}" is active but missing from ENABLED_AI_MODELS (never initialized on the server)`,
    );
  }
}

// --- 5. inactive participants that are still enabled ------------------------
for (const id of ENABLED_AI_MODELS) {
  const participant = participantsById.get(id);
  if (participant?.status === "inactive") {
    warn(
      `"${id}" is in ENABLED_AI_MODELS but its participant status is "inactive" (enabled list is misleading)`,
    );
  }
}

// --- 6. providers with no DEFAULT_MODELS fallback ---------------------------
for (const [providerKey, provider] of Object.entries(AI_PROVIDERS)) {
  if (!DEFAULT_MODELS[provider.name]) {
    err(
      `provider ${providerKey} ("${provider.name}") has no DEFAULT_MODELS entry (callers that omit a model get undefined)`,
    );
  }
}

// --- 7. alias and emoji collisions ------------------------------------------
const seenAliases = new Map<string, string>();
const seenEmoji = new Map<string, string>();
for (const participant of DEFAULT_AI_PARTICIPANTS) {
  const alias = participant.alias.toLowerCase();
  const previousAlias = seenAliases.get(alias);
  if (previousAlias) {
    err(
      `alias "${participant.alias}" is shared by ${previousAlias} and ${participant.id} (@mentions resolve to whichever is first)`,
    );
  } else {
    seenAliases.set(alias, participant.id);
  }

  const previousEmoji = seenEmoji.get(participant.emoji);
  if (previousEmoji) {
    warn(
      `emoji ${participant.emoji} is shared by ${previousEmoji} and ${participant.id}`,
    );
  } else {
    seenEmoji.set(participant.emoji, participant.id);
  }
}

// --- 8. duplicate API ids ----------------------------------------------------
for (const [apiId, owners] of apiIdOwners) {
  if (owners.length > 1) {
    warn(
      `API id "${apiId}" is served by ${owners.length} models (${owners.join(", ")}) — they are indistinguishable bots`,
    );
  }
}

// --- 9. env var agreement between the two places that declare it ------------
for (const [providerKey, provider] of Object.entries(AI_PROVIDERS)) {
  const serverEnvVar = PROVIDER_ENV_VARS[providerKey];
  if (!serverEnvVar) {
    err(
      `provider ${providerKey} has no PROVIDER_ENV_VARS entry in ${AI_MODELS_PATH} (its models are never initialized)`,
    );
    continue;
  }
  if (serverEnvVar !== provider.apiKeyEnvVar) {
    err(
      `provider ${providerKey} env var disagrees: provider config says "${provider.apiKeyEnvVar}", ${AI_MODELS_PATH} says "${serverEnvVar}"`,
    );
  }
}

for (const providerKey of Object.keys(PROVIDER_ENV_VARS)) {
  if (!(providerKey in AI_PROVIDERS)) {
    warn(
      `PROVIDER_ENV_VARS lists "${providerKey}" which is not a known provider`,
    );
  }
}

// --- 10. live OpenRouter catalog check (opt-in) -----------------------------
/**
 * Falls back to curl because fetch fails behind some corporate/agent HTTPS
 * proxies that curl already has CA configuration for.
 */
const fetchCatalog = async (): Promise<string> => {
  try {
    const response = await fetch(OPENROUTER_CATALOG_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } catch {
    const curl = Bun.spawnSync([
      "curl",
      "-sS",
      "--max-time",
      "60",
      OPENROUTER_CATALOG_URL,
    ]);
    if (curl.exitCode !== 0) {
      throw new Error(new TextDecoder().decode(curl.stderr).trim());
    }
    return new TextDecoder().decode(curl.stdout);
  }
};

const checkLiveCatalog = async () => {
  const body = JSON.parse(await fetchCatalog()) as { data: { id: string }[] };
  const live = new Set(body.data.map((m) => m.id));

  for (const [providerKey, provider] of Object.entries(AI_PROVIDERS)) {
    if (provider.apiKeyEnvVar !== OPENROUTER_ENV_VAR) continue;
    for (const [modelKey, model] of Object.entries(provider.models)) {
      const id = `${providerKey}_${modelKey}`;
      const apiId = (model as { id: string }).id;
      if (live.has(apiId)) continue;

      // A parked model is never dispatched, so a stale id there is dead
      // weight rather than a live 404.
      if (enabledSet.has(id)) {
        err(
          `${id} -> "${apiId}" is NOT in the live OpenRouter catalog (requests will 404)`,
        );
      } else {
        warn(
          `${id} -> "${apiId}" is delisted upstream (already parked as inactive; safe to delete)`,
        );
      }
    }
  }
};

if (process.argv.includes("--live")) {
  try {
    await checkLiveCatalog();
  } catch (error) {
    warn(
      `live OpenRouter check skipped: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// --- report ------------------------------------------------------------------
const errors = problems.filter((p) => p.severity === "error");
const warnings = problems.filter((p) => p.severity === "warn");

for (const { message } of warnings) console.warn(`  warn   ${message}`);
for (const { message } of errors) console.error(`  ERROR  ${message}`);

const activeCount = DEFAULT_AI_PARTICIPANTS.filter(
  (p) => p.status === "active",
).length;

console.log(
  `\n${Object.keys(AI_PROVIDERS).length} providers · ${declaredIds.size} models · ` +
    `${DEFAULT_AI_PARTICIPANTS.length} participants (${activeCount} active) · ` +
    `${ENABLED_AI_MODELS.length} enabled`,
);
console.log(`${errors.length} errors, ${warnings.length} warnings`);

if (errors.length > 0) process.exit(1);
