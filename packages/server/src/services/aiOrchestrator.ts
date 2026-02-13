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

  try {
    const failedConfigs = await orchestrator.initializeAIs(aiConfigs);

    const initializedModels = Array.from(orchestrator.aiServices.values())
      .map(toOrchestratorAIServiceInfo)
      .filter((ai): ai is OrchestratorAIServiceInfo => ai !== null);

    // Print single consolidated summary after all health checks complete
    const successCount = initializedModels.length;
    const failCount = failedConfigs.length;
    const totalCount = aiConfigs.length;

    console.log("");
    console.log(`✅ Initialized ${successCount}/${totalCount} AI services`);

    if (initializedModels.length > 0) {
      initializedModels.forEach((ai) => {
        const emoji = ai.emoji || "🤖";
        const name = ai.displayName || ai.name;
        console.log(`   ${emoji} ${name}`);
      });
    }

    if (failCount > 0) {
      console.log("");
      console.warn(`⚠️  ${failCount} model(s) failed to initialize:`);
      failedConfigs.forEach((failed) => {
        const label =
          failed.displayName ||
          failed.alias ||
          `${failed.providerKey}_${failed.modelKey}`;
        const shortError = extractShortError(failed.error);
        console.warn(`   • ${label} — ${shortError}`);
      });
    }

    console.log("");
  } catch (error) {
    console.error("❌ Failed to initialize AI services:", error);
  }

  return orchestrator;
};

/**
 * Extract a concise error reason from a ServiceInitializationError message.
 * Strips nested "Failed to initialize..." and "Service configuration..." wrappers.
 */
const extractShortError = (error?: string): string => {
  if (!error) return "unknown error";

  // Common pattern: "Failed to initialize Foo: Service configuration validation failed: Health check failed: <actual reason>"
  const healthCheckMatch = error.match(/Health check failed:\s*(.+)/);
  if (healthCheckMatch) return healthCheckMatch[1].trim();

  // Fallback: strip "Failed to initialize <Name>: " prefix
  const initMatch = error.match(/Failed to initialize [^:]+:\s*(.+)/);
  if (initMatch) return initMatch[1].trim();

  return error;
};
