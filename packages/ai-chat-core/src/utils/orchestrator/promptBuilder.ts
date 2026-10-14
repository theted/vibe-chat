import { AI_PROVIDERS } from "@/config/aiProviders/index.js";
import {
  enhanceSystemPromptWithPersona,
  getPersonaFromProvider,
} from "@/utils/personaUtils.js";
import { getEnvFlag, parseBooleanEnvFlag } from "@/utils/stringUtils.js";
import { SYSTEM_PROMPT } from "@/orchestrator/constants.js";
import type { ContextMessage } from "@/types/orchestrator.js";
import {
  getAIDisplayName,
  getMentionTokenForAI,
  type OrchestratorAIService,
} from "./aiLookup.js";

type SystemPromptOptions = {
  /** One-liners of messages that scrolled out of the context window. */
  conversationDigest?: string;
  /**
   * The AIs that can speak in this room. Defaults to every AI in
   * `aiServices`; a room scoped to a subset passes just those.
   */
  roomAIs?: OrchestratorAIService[];
};

/** "Claude (@claude)" - the handle is what the model must write to mention. */
const describeParticipant = (ai: OrchestratorAIService) => {
  const name = getAIDisplayName(ai);
  const handle = getMentionTokenForAI(ai);
  return handle && handle !== name ? `${name} (@${handle})` : name;
};

export const createEnhancedSystemPrompt = (
  aiService: OrchestratorAIService,
  _context: ContextMessage[],
  isUserResponse: boolean,
  aiServices: Map<string, OrchestratorAIService>,
  { conversationDigest = "", roomAIs }: SystemPromptOptions = {},
) => {
  const selfName = getAIDisplayName(aiService) || aiService.name;
  const selfHandle = getMentionTokenForAI(aiService);
  let prompt = `You are ${selfName}${selfHandle ? ` (@${selfHandle})` : ""}, an AI participating in a dynamic group chat. `;

  if (isUserResponse) {
    prompt += `${SYSTEM_PROMPT.INTRO_USER_RESPONSE} `;
  } else {
    prompt += `${SYSTEM_PROMPT.INTRO_BACKGROUND} `;
  }

  prompt += SYSTEM_PROMPT.GUIDELINES;

  prompt += `

${SYSTEM_PROMPT.TRANSCRIPT_FORMAT}`;

  const otherAIs = (roomAIs ?? Array.from(aiServices.values()))
    .filter((ai) => ai !== aiService && ai.id !== aiService.id)
    .map(describeParticipant)
    .filter(Boolean);

  if (otherAIs.length > 0) {
    prompt += `

Other AIs in this chat: ${otherAIs.join(", ")}`;
  }

  // Older messages evicted from the sliding window survive as one-line
  // excerpts, so long conversations keep a memory beyond the context cap
  if (conversationDigest) {
    prompt += `

${SYSTEM_PROMPT.DIGEST_HEADER}
${conversationDigest}`;
  }

  prompt += `

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
