import { ChatOrchestrator } from "@ai-chat/core";
import {
  type AIConfig,
  PROVIDER_ENV_VARS,
  getProviderAIConfigs,
} from "@/config/aiModels.js";
import {
  toOrchestratorAIServiceInfo,
  type OrchestratorAIServiceInfo,
} from "@/utils/aiServiceUtils.js";
import {
  writeModelCache,
  buildModelCache,
  ensureStartupLogWritable,
  initStartupEntry,
  appendModelToCurrentStartup,
  mergeIntoLastStartupEntry,
  getPreviouslyWorkingSet,
  getLastWorkingModels,
  readStartupLog,
  type StartupMode,
  type StartupLogParticipant,
} from "./modelCacheService.js";

const parseBoolFlag = (value?: string): boolean =>
  value?.toLowerCase() === "true";

type ModelInitResult = {
  providerKey: string;
  modelKey: string;
  status: "ok" | "error";
  error?: string;
};

/** Initialize one model and immediately write its result to the startup log. */
const initSingleModel = async (
  orchestrator: ChatOrchestrator,
  config: AIConfig,
  skipHealthCheck: boolean,
  startedAt: string,
): Promise<ModelInitResult> => {
  const [result] = await orchestrator.initializeAIs([config], { skipHealthCheck });
  appendModelToCurrentStartup(startedAt, {
    provider: result.providerKey,
    model: result.modelKey,
    success: result.status === "ok",
    ...(result.error ? { error: result.error } : {}),
  });
  return result;
};

const printStartupSummary = (logPath: string): void => {
  const log = readStartupLog();
  if (log.length === 0) return;
  const last = log[log.length - 1];
  const ok = last.participants.filter((p) => p.success);
  const fail = last.participants.filter((p) => !p.success);

  console.log("");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📄 Startup log: ${logPath}`);
  console.log(`   Mode: ${last.mode} | Started: ${last.startedAt}`);
  console.log(`   ✅ ${ok.length} active | ❌ ${fail.length} failed`);
  if (ok.length > 0) {
    console.log("   Active participants:");
    ok.forEach((p) => console.log(`     • ${p.provider} / ${p.model}`));
  }
  if (fail.length > 0) {
    console.log("   Failed:");
    fail.forEach((p) =>
      console.log(`     • ${p.provider} / ${p.model}: ${p.error?.slice(0, 80) ?? "unknown"}`),
    );
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("");
};

export const initializeAISystem = async (): Promise<ChatOrchestrator> => {
  console.log("🤖 Initializing AI Chat System...");

  // Verify startup log is writable before doing anything — crashes if not
  ensureStartupLogWritable();

  const orchestrator = new ChatOrchestrator();

  let aiConfigs: AIConfig[] = [];

  if (process.env.OPENAI_API_KEY) {
    aiConfigs.push(...getProviderAIConfigs("OPENAI", "OPENAI_MODEL_ALLOWLIST"));
  }
  const otherProviders = Object.keys(PROVIDER_ENV_VARS).filter((p) => p !== "OPENAI");
  for (const providerKey of otherProviders) {
    const envVar = PROVIDER_ENV_VARS[providerKey];
    if (process.env[envVar]) {
      aiConfigs.push(...getProviderAIConfigs(providerKey));
    }
  }

  if (aiConfigs.length === 0) {
    console.warn("⚠️  No AI API keys found! Please set API keys in environment variables.");
    console.warn(`Available keys: ${Object.values(PROVIDER_ENV_VARS).join(", ")}`);
    aiConfigs.push({ providerKey: "MOCK", modelKey: "MOCK_AI" });
  }

  const skipHealthCheck = parseBoolFlag(process.env.AI_CHAT_SKIP_HEALTHCHECK);
  const recheckAvailability = parseBoolFlag(process.env.AI_CHAT_RECHECK_AVAILABILITY);
  const useLastWorking = parseBoolFlag(process.env.AI_CHAT_USE_LAST_WORKING);
  const tryMerge = parseBoolFlag(process.env.AI_CHAT_TRY_MERGE);

  const startedAt = new Date().toISOString();
  const allResults: ModelInitResult[] = [];

  // ── Determine startup mode ──────────────────────────────────────────────────

  let mode: StartupMode;
  let configsToRun: AIConfig[];
  let doHealthCheck: boolean;

  console.log("");
  console.log("┌─────────────────────────────────────────────────────┐");
  console.log("│            PARTICIPANT STARTUP DECISION             │");
  console.log("└─────────────────────────────────────────────────────┘");

  if (recheckAvailability) {
    console.log("⚠️  FLAG: --recheck-availability");
    console.log("    IGNORING STARTUP LOG — FORCING FULL HEALTHCHECK FOR ALL MODELS");
    mode = "healthcheck";
    configsToRun = aiConfigs;
    doHealthCheck = true;

  } else if (tryMerge) {
    console.log("⚡ FLAG: --try-merge");
    const lastLog = readStartupLog();
    const lastEntry = lastLog[lastLog.length - 1];
    if (!lastEntry) {
      console.log("    NO STARTUP LOG FOUND — falling back to full healthcheck");
      mode = "healthcheck";
      configsToRun = aiConfigs;
      doHealthCheck = true;
    } else {
      // prevOk: confirmed working in last entry (any entry mode — cached entries only record successes)
      // toCheck: everything configured but NOT in prevOk — previously failed OR never attempted
      const prevOk = new Set(
        lastEntry.participants.filter((p) => p.success).map((p) => `${p.provider}_${p.model}`),
      );
      const knownGood = aiConfigs.filter((c) => prevOk.has(`${c.providerKey}_${c.modelKey}`));
      const toCheck = aiConfigs.filter((c) => !prevOk.has(`${c.providerKey}_${c.modelKey}`));
      console.log(`    TRUSTING ${knownGood.length} PREVIOUSLY-WORKING MODELS — NO HEALTHCHECK FOR THEM`);
      console.log(`    RETRYING ${toCheck.length} UNKNOWN/FAILED MODELS WITH HEALTHCHECK`);
      console.log("    RESULTS WILL BE MERGED INTO LAST LOG ENTRY (not appended as new run)");
      mode = "try-merge";
      configsToRun = aiConfigs; // all configs — split handled in initialization block below
      doHealthCheck = false; // handled per-model below
    }

  } else if (skipHealthCheck) {
    console.log("⚠️  FLAG: --skip-healthcheck");
    console.log("    SKIPPING ALL HEALTHCHECKS — ADDING ALL CONFIGURED MODELS AS-IS");
    console.log("    (startup log is still written, but not used for filtering)");
    mode = "skip-healthcheck";
    configsToRun = aiConfigs;
    doHealthCheck = false;

  } else {
    const previouslyWorking = useLastWorking
      ? new Set(getLastWorkingModels().map((m) => `${m.provider}_${m.model}`))
      : getPreviouslyWorkingSet();

    if (previouslyWorking.size > 0) {
      const total = aiConfigs.length;
      configsToRun = aiConfigs.filter((c) =>
        previouslyWorking.has(`${c.providerKey}_${c.modelKey}`),
      );
      const skipped = total - configsToRun.length;
      mode = "cached";
      doHealthCheck = false;

      if (useLastWorking) {
        console.log("⚡ FLAG: --use-last-working");
      }
      console.log("✅ STARTUP LOG EXISTS WITH WORKING PARTICIPANTS");
      console.log("   → WILL NOT PERFORM ANY PARTICIPANT HEALTHCHECKS");
      console.log(`   → Loading ${configsToRun.length} previously-working models`);
      if (skipped > 0) {
        console.log(`   → Skipping ${skipped} models not in last successful run`);
      }
    } else {
      console.log("ℹ️  NO STARTUP LOG FOUND (or no successful entries)");
      console.log("   → PERFORMING FULL HEALTHCHECK FOR ALL CONFIGURED MODELS");
      console.log(`   → ${aiConfigs.length} models will be checked`);
      mode = "healthcheck";
      configsToRun = aiConfigs;
      doHealthCheck = true;
    }
  }

  console.log(`   Mode: ${mode}`);
  console.log("─────────────────────────────────────────────────────");
  console.log("");

  // ── Initialize models ───────────────────────────────────────────────────────

  if (mode === "try-merge") {
    // Re-derive prevOk here (mode decision block already validated lastEntry exists)
    const lastEntry = readStartupLog().at(-1)!;
    const prevOk = new Set(
      lastEntry.participants.filter((p) => p.success).map((p) => `${p.provider}_${p.model}`),
    );
    const knownGood = configsToRun.filter((c) => prevOk.has(`${c.providerKey}_${c.modelKey}`));
    const toCheck = configsToRun.filter((c) => !prevOk.has(`${c.providerKey}_${c.modelKey}`));

    console.log(`⚙️  try-merge: ${knownGood.length} trusted (no check) + ${toCheck.length} to healthcheck...`);
    const mergeResults: StartupLogParticipant[] = [];

    for (const config of knownGood) {
      const [result] = await orchestrator.initializeAIs([config], { skipHealthCheck: true });
      mergeResults.push({
        provider: result.providerKey,
        model: result.modelKey,
        success: result.status === "ok",
        ...(result.error ? { error: result.error } : {}),
      });
      allResults.push(result);
    }

    for (const config of toCheck) {
      console.log(`🩺 Healthchecking: ${config.providerKey}_${config.modelKey}`);
      const [result] = await orchestrator.initializeAIs([config], { skipHealthCheck: false });
      mergeResults.push({
        provider: result.providerKey,
        model: result.modelKey,
        success: result.status === "ok",
        ...(result.error ? { error: result.error } : {}),
      });
      allResults.push(result);
    }

    mergeIntoLastStartupEntry(mergeResults);
  } else {
    // Normal path: all models use the same healthcheck setting, append new entry
    initStartupEntry({ startedAt, mode });
    console.log(`⚙️  Initializing ${configsToRun.length} models (healthcheck: ${doHealthCheck})...`);
    for (const config of configsToRun) {
      const result = await initSingleModel(orchestrator, config, !doHealthCheck, startedAt);
      allResults.push(result);
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────────

  const initializedModels = Array.from(orchestrator.aiServices.values())
    .map(toOrchestratorAIServiceInfo)
    .filter((ai): ai is OrchestratorAIServiceInfo => ai !== null);

  console.log(`✅ Initialized ${initializedModels.length}/${configsToRun.length} AI services`);

  const failCount = configsToRun.length - initializedModels.length;
  if (failCount > 0) {
    console.warn(`⚠️  ${failCount} model(s) failed to initialize`);
  }

  // Write models.json for healthcheck runs (backward compat for tooling)
  if (mode === "healthcheck") {
    writeModelCache(buildModelCache(allResults));
    console.log("💾 Model availability saved to models.json");
  }

  // Print file path + contents summary so it's always visible in logs
  const logPath = process.env.STARTUP_LOG_PATH ?? `${process.cwd()}/startup-log.json`;
  printStartupSummary(logPath);

  return orchestrator;
};
