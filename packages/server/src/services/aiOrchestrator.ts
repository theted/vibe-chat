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
  readModelCache,
  writeModelCache,
  buildModelCache,
} from "./modelCacheService.js";

const parseBoolFlag = (value?: string): boolean =>
  value?.toLowerCase() === "true";

export const initializeAISystem = async (): Promise<ChatOrchestrator> => {
  console.log("🤖 Initializing AI Chat System...");

  // Uses defaults from @ai-chat/core constants
  const orchestrator = new ChatOrchestrator();

  let aiConfigs: AIConfig[] = [];

  if (process.env.OPENAI_API_KEY) {
    aiConfigs.push(...getProviderAIConfigs("OPENAI", "OPENAI_MODEL_ALLOWLIST"));
  }

  const otherProviders = Object.keys(PROVIDER_ENV_VARS).filter(
    (provider) => provider !== "OPENAI",
  );
  for (const providerKey of otherProviders) {
    const envVar = PROVIDER_ENV_VARS[providerKey];
    if (process.env[envVar]) {
      aiConfigs.push(...getProviderAIConfigs(providerKey));
    }
  }

  if (aiConfigs.length === 0) {
    console.warn(
      "⚠️  No AI API keys found! Please set API keys in environment variables.",
    );
    const availableKeys = Object.values(PROVIDER_ENV_VARS).join(", ");
    console.warn(`Available keys: ${availableKeys}`);

    aiConfigs.push({ providerKey: "MOCK", modelKey: "MOCK_AI" });
  }

  const skipHealthCheck = parseBoolFlag(process.env.AI_CHAT_SKIP_HEALTHCHECK);
  const recheckAvailability = parseBoolFlag(
    process.env.AI_CHAT_RECHECK_AVAILABILITY,
  );

  // Determine whether to use cached model availability
  let useCache = false;
  if (!skipHealthCheck && !recheckAvailability) {
    const cache = readModelCache();
    if (cache) {
      useCache = true;
      const cachedOkModels = new Set(
        cache.models
          .filter((m) => m.status === "ok")
          .map((m) => `${m.provider}_${m.model}`),
      );

      const totalConfigured = aiConfigs.length;
      aiConfigs = aiConfigs.filter((c) =>
        cachedOkModels.has(`${c.providerKey}_${c.modelKey}`),
      );

      console.log(
        `📋 Using cached model availability from models.json (${aiConfigs.length}/${totalConfigured} models available)`,
      );
      console.log(
        "   Run with --recheck-availability to force a fresh health check.",
      );
    }
  }

  if (recheckAvailability) {
    console.log("🔄 Rechecking all model availability...");
  }

  try {
    const results = await orchestrator.initializeAIs(aiConfigs, {
      skipHealthCheck: useCache || skipHealthCheck,
    });

    const initializedModels = Array.from(orchestrator.aiServices.values())
      .map(toOrchestratorAIServiceInfo)
      .filter((ai): ai is OrchestratorAIServiceInfo => ai !== null);
    console.log(
      `✅ Initialized ${initializedModels.length}/${aiConfigs.length} AI services`,
    );

    if (initializedModels.length > 0) {
      console.log("📋 Active AI models:");
      initializedModels.forEach((ai) => {
        const emoji = ai.emoji || "🤖";
        const name = ai.displayName || ai.name;
        console.log(`   ${emoji} ${name}`);
      });
    }

    if (initializedModels.length < aiConfigs.length) {
      console.warn(
        `⚠️  ${aiConfigs.length - initializedModels.length} model(s) failed to initialize`,
      );
    }

    // Write cache when performing actual health checks (not using cache, not skipping)
    if (!useCache && !skipHealthCheck && results) {
      writeModelCache(buildModelCache(results));
      console.log("💾 Model availability saved to models.json");
    }
  } catch (error) {
    console.error("❌ Failed to initialize some AI services:", error);
  }

  return orchestrator;
};
