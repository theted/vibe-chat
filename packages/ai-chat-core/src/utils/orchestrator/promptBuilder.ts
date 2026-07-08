import { AI_PROVIDERS } from "@/config/aiProviders/index.js";
import {
  enhanceSystemPromptWithPersona,
  getPersonaFromProvider,
} from "@/utils/personaUtils.js";
import { getEnvFlag, parseBooleanEnvFlag } from "@/utils/stringUtils.js";
import { SYSTEM_PROMPT } from "@/orchestrator/constants.js";
import type { ContextMessage } from "@/types/orchestrator.js";
import { getAIDisplayName, type OrchestratorAIService } from "./aiLookup.js";

export const createEnhancedSystemPrompt = (
  aiService: OrchestratorAIService,
  context: ContextMessage[],
  isUserResponse: boolean,
  aiServices: Map<string, OrchestratorAIService>,
) => {
  let prompt = `You are ${aiService.name}, an AI participating in a dynamic group chat. `;

  if (isUserResponse) {
    prompt += `${SYSTEM_PROMPT.INTRO_USER_RESPONSE} `;
  } else {
    prompt += `${SYSTEM_PROMPT.INTRO_BACKGROUND} `;
  }

  prompt += SYSTEM_PROMPT.GUIDELINES;

  const otherAINames = Array.from(aiServices.values())
    .filter((ai) => ai !== aiService)
    .map((ai) => getAIDisplayName(ai))
    .filter(Boolean);

  prompt += `

Other AIs in this chat: ${otherAINames.join(", ")}

${SYSTEM_PROMPT.CLOSING}`;

  const personasEnabled = parseBooleanEnvFlag(
    getEnvFlag("AI_CHAT_ENABLE_PERSONAS"),
  );
  const providerKey = aiService?.config?.providerKey;
  const fallbackProvider = providerKey
    ? AI_PROVIDERS[providerKey as keyof typeof AI_PROVIDERS]
    : undefined;
  const personaProvider =
    aiService?.service?.config?.provider || fallbackProvider;
  const persona =
    personasEnabled && personaProvider
      ? getPersonaFromProvider(personaProvider)
      : null;

  if (persona) {
    prompt = enhanceSystemPromptWithPersona(prompt, persona);
  }

  return prompt;
};
