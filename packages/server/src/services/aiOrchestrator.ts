import { ChatOrchestrator } from "@ai-chat/core";
import {
  type AIConfig,
  PROVIDER_ENV_VARS,
  getProviderAIConfigs,
} from "@/config/aiModels.js";

type OrchestratorAIServiceInfo = {
  emoji?: string;
  displayName?: string;
  name?: string;
};

const toOrchestratorAIServiceInfo = (
  value: unknown
): OrchestratorAIServiceInfo | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  return value as OrchestratorAIServiceInfo;
};

export const initializeAISystem = async (): Promise<ChatOrchestrator> => {
  console.log("🤖 Initializing AI Chat System...");

  // Uses defaults from @ai-chat/core constants
  const orchestrator = new ChatOrchestrator();

  let aiConfigs: AIConfig[] = [];

  if (process.env.OPENAI_API_KEY) {
    aiConfigs.push(...getProviderAIConfigs("OPENAI", "OPENAI_MODEL_ALLOWLIST"));
  }

  const otherProviders = Object.keys(PROVIDER_ENV_VARS).filter(
    (provider) => provider !== "OPENAI"
  );
  for (const providerKey of otherProviders) {
    const envVar = PROVIDER_ENV_VARS[providerKey];
    if (process.env[envVar]) {
      aiConfigs.push(...getProviderAIConfigs(providerKey));
    }
  }

  if (aiConfigs.length === 0) {
    console.warn(
      "⚠️  No AI API keys found! Please set API keys in environment variables."
    );
    const availableKeys = Object.values(PROVIDER_ENV_VARS).join(", ");
    console.warn(`Available keys: ${availableKeys}`);

    aiConfigs.push({ providerKey: "MOCK", modelKey: "MOCK_AI" });
  }

  try {
    await orchestrator.initializeAIs(aiConfigs);

    const initializedModels = Array.from(orchestrator.aiServices.values())
      .map(toOrchestratorAIServiceInfo)
      .filter(
        (ai): ai is OrchestratorAIServiceInfo => ai !== null
      );
    console.log(
      `✅ Initialized ${initializedModels.length}/${aiConfigs.length} AI services`
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
        `⚠️  ${aiConfigs.length - initializedModels.length} model(s) failed to initialize`
      );
    }
  } catch (error) {
    console.error("❌ Failed to initialize some AI services:", error);
  }

  return orchestrator;
};
