import { SYSTEM_PROMPT } from "@/orchestrator/constants.js";
import type { DigestSpeaker } from "@/orchestrator/ContextManager.js";
import type { ContextMessage } from "@/types/orchestrator.js";
import {
  getAIDisplayName,
  getMentionTokenForAI,
  type OrchestratorAIService,
} from "./aiLookup.js";
import { buildRosterSection, findPostedAIIds } from "./roster.js";

/**
 * Whether @Chat can answer in this room. Unset means unavailable, so a caller
 * that runs no @Chat (the CLI, tests) never advertises one.
 */
export type ChatAssistantPromptInfo = {
  available: boolean;
  /** False in private rooms, where @Chat won't quote the chat in an issue. */
  canFileIssues?: boolean;
};

type SystemPromptOptions = {
  /** One-liners of messages that scrolled out of the context window. */
  conversationDigest?: string;
  /**
   * Who wrote each digest line, so AIs whose messages scrolled out of the
   * window still count as having posted.
   */
  digestSpeakers?: DigestSpeaker[];
  /**
   * The AIs that can speak in this room. Defaults to every AI in
   * `aiServices`; a room scoped to a subset passes just those.
   */
  roomAIs?: OrchestratorAIService[];
  /** Adds the @Chat section when @Chat can answer in this room. */
  chatAssistant?: ChatAssistantPromptInfo;
};

export const createEnhancedSystemPrompt = (
  aiService: OrchestratorAIService,
  context: ContextMessage[],
  isUserResponse: boolean,
  aiServices: Map<string, OrchestratorAIService>,
  {
    conversationDigest = "",
    digestSpeakers = [],
    roomAIs,
    chatAssistant,
  }: SystemPromptOptions = {},
) => {
  const selfName = getAIDisplayName(aiService) || aiService.name;
  const selfHandle = getMentionTokenForAI(aiService);
  let prompt = `${SYSTEM_PROMPT.ROLE(selfName, selfHandle)} `;

  if (isUserResponse) {
    prompt += `${SYSTEM_PROMPT.INTRO_USER_RESPONSE} `;
  } else {
    prompt += `${SYSTEM_PROMPT.INTRO_BACKGROUND} `;
  }

  prompt += SYSTEM_PROMPT.GUIDELINES;

  // Only where @Chat can actually answer, so models don't ask into the void
  if (chatAssistant?.available) {
    prompt += `
${SYSTEM_PROMPT.CHAT_ASSISTANT(chatAssistant.canFileIssues ?? false)}`;
  }

  prompt += `

${SYSTEM_PROMPT.TRANSCRIPT_FORMAT}`;

  const otherAIs = (roomAIs ?? Array.from(aiServices.values())).filter(
    (ai) => ai !== aiService && ai.id !== aiService.id,
  );
  // "Active" means posted somewhere the model can see (window or digest),
  // so it never hears of a message it can't find in the transcript
  const postedAIIds = findPostedAIIds(aiServices, [
    ...digestSpeakers,
    ...context,
  ]);
  const roster = buildRosterSection(otherAIs, postedAIIds);
  if (roster) {
    prompt += `

${roster}`;
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

  return prompt;
};
