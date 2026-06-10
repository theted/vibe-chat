/**
 * AI System Startup (stale-while-revalidate)
 *
 * Every enabled model is instantiated immediately without any API calls, so
 * the server is up in seconds. Models with a fresh success in the health
 * cache are trusted as-is; the rest (new, expired, previously failed, or
 * model-id changed) are health-checked in the background after the server
 * starts serving, and failures are removed from the live participant set.
 *
 * Flags:
 *   AI_CHAT_SKIP_HEALTHCHECK     — disable background health checks entirely
 *   AI_CHAT_RECHECK_AVAILABILITY — ignore the health cache, recheck all models
 */

import {
  ChatOrchestrator,
  AI_PROVIDERS,
  runWithConcurrencyLimit,
} from "@ai-chat/core";
import {
  type AIConfig,
  PROVIDER_ENV_VARS,
  getProviderAIConfigs,
} from "@/config/aiModels.js";
import {
  classifyModels,
  getHealthTtlMs,
  readHealthCache,
  recordFailure,
  recordSuccess,
} from "./modelHealthCache.js";

const MAX_PARALLEL_HEALTH_CHECKS = 8;

const parseBoolFlag = (value?: string): boolean =>
  value?.toLowerCase() === "true";

type HealthCheckCandidate = {
  /** Participant ID, identical to the orchestrator's aiId. */
  id: string;
  /** Provider model id string (e.g. "gpt-5.5") for cache invalidation. */
  modelId: string;
};

export type BackgroundRevalidationOptions = {
  /** Invoked whenever a model is removed from the live participant set. */
  onParticipantsChanged?: () => void;
};

export type AISystem = {
  orchestrator: ChatOrchestrator;
  /** Health-checks untrusted models in the background; resolves when done. */
  startBackgroundRevalidation: (
    options?: BackgroundRevalidationOptions,
  ) => Promise<void>;
};

const getModelId = (config: AIConfig): string => {
  const provider =
    AI_PROVIDERS[config.providerKey as keyof typeof AI_PROVIDERS];
  return provider?.models[config.modelKey]?.id ?? config.modelKey;
};

const collectConfiguredAIs = (): AIConfig[] => {
  const aiConfigs: AIConfig[] = [];

  if (process.env.OPENAI_API_KEY) {
    aiConfigs.push(...getProviderAIConfigs("OPENAI", "OPENAI_MODEL_ALLOWLIST"));
  }
  const otherProviders = Object.keys(PROVIDER_ENV_VARS).filter(
    (p) => p !== "OPENAI",
  );
  for (const providerKey of otherProviders) {
    if (process.env[PROVIDER_ENV_VARS[providerKey]]) {
      aiConfigs.push(...getProviderAIConfigs(providerKey));
    }
  }

  return aiConfigs;
};

export const initializeAISystem = async (): Promise<AISystem> => {
  console.log("🤖 Initializing AI Chat System...");

  const aiConfigs = collectConfiguredAIs();
  if (aiConfigs.length === 0) {
    console.warn(
      "⚠️  No AI API keys found! Please set API keys in environment variables.",
    );
    console.warn(
      `Available keys: ${Object.values(PROVIDER_ENV_VARS).join(", ")}`,
    );
    aiConfigs.push({ providerKey: "MOCK", modelKey: "MOCK_AI" });
  }

  const skipHealthCheck = parseBoolFlag(process.env.AI_CHAT_SKIP_HEALTHCHECK);
  const recheckAll = parseBoolFlag(process.env.AI_CHAT_RECHECK_AVAILABILITY);

  const orchestrator = new ChatOrchestrator();

  // Instantiate every enabled model immediately — no API calls, parallelized
  // inside initializeAIs. Failures here are local (bad config), not network.
  const initResults = await orchestrator.initializeAIs(aiConfigs, {
    skipHealthCheck: true,
  });

  const candidates: HealthCheckCandidate[] = [];
  for (const result of initResults) {
    const config = aiConfigs.find(
      (c) =>
        c.providerKey === result.providerKey && c.modelKey === result.modelKey,
    );
    const id = `${result.providerKey}_${result.modelKey}`;
    const modelId = config ? getModelId(config) : result.modelKey;
    if (result.status === "ok") {
      candidates.push({ id, modelId });
    } else {
      recordFailure(id, modelId, result.error ?? "initialization failed");
    }
  }

  const { trusted, toCheck } = classifyModels(candidates, readHealthCache(), {
    ttlMs: getHealthTtlMs(),
    recheckAll,
  });

  console.log(
    `✅ Loaded ${candidates.length}/${aiConfigs.length} AI services ` +
      `(${trusted.length} trusted from health cache, ${toCheck.length} queued for background check)`,
  );
  if (skipHealthCheck) {
    console.log("⚠️  AI_CHAT_SKIP_HEALTHCHECK — background health checks disabled");
  } else if (recheckAll) {
    console.log("⚠️  AI_CHAT_RECHECK_AVAILABILITY — health cache ignored, rechecking all models");
  }

  const startBackgroundRevalidation = async ({
    onParticipantsChanged,
  }: BackgroundRevalidationOptions = {}): Promise<void> => {
    if (skipHealthCheck || toCheck.length === 0) {
      if (!skipHealthCheck) {
        console.log("🩺 All models trusted from health cache — nothing to revalidate");
      }
      return;
    }

    console.log(
      `🩺 Background health check: ${toCheck.length} model(s), up to ${MAX_PARALLEL_HEALTH_CHECKS} in parallel...`,
    );
    let failures = 0;

    const tasks = toCheck.map((candidate) => async () => {
      const service = orchestrator.aiServices.get(candidate.id)?.service;
      if (!service) return;

      let healthy = false;
      try {
        healthy = await service.validateConfiguration();
      } catch {
        healthy = false;
      }

      if (healthy) {
        recordSuccess(candidate.id, candidate.modelId);
        return;
      }

      const error =
        service.getLastValidationError?.() ?? "health check failed";
      recordFailure(candidate.id, candidate.modelId, error);
      orchestrator.removeAI(candidate.id);
      failures += 1;
      console.warn(
        `🩺 ❌ ${candidate.id}: ${error.slice(0, 120)} — removed from participants`,
      );
      onParticipantsChanged?.();
    });

    await runWithConcurrencyLimit(tasks, MAX_PARALLEL_HEALTH_CHECKS);
    console.log(
      `🩺 Background health check complete: ${toCheck.length - failures} ok, ${failures} removed`,
    );
  };

  return { orchestrator, startBackgroundRevalidation };
};
