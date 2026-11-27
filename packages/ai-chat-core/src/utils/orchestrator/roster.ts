/**
 * The "other AIs in this chat" roster in the system prompt, split by who has
 * actually posted. A flat list of 100+ handles gave no hint of who had spoken,
 * so models thanked or answered AIs that hadn't said anything yet.
 */

import { SYSTEM_PROMPT } from "@/orchestrator/constants.js";
import {
  findAIFromContextMessage,
  getAIDisplayName,
  getMentionTokenForAI,
  type MessageSender,
  type OrchestratorAIService,
} from "./aiLookup.js";

/** "Claude (@claude)" - the handle is what the model must write to mention. */
export const describeParticipant = (ai: OrchestratorAIService) => {
  const name = getAIDisplayName(ai);
  const handle = getMentionTokenForAI(ai);
  return handle && handle !== name ? `${name} (@${handle})` : name;
};

/**
 * Ids of the AIs that sent at least one of `speakers`. Only AI messages
 * count: a person whose name matches a model's alias hasn't made that
 * model active.
 */
export const findPostedAIIds = (
  aiServices: Map<string, OrchestratorAIService>,
  speakers: MessageSender[],
): Set<string> => {
  const ids = new Set<string>();
  for (const speaker of speakers) {
    if (speaker.senderType !== "ai") continue;
    const ai = findAIFromContextMessage(aiServices, speaker);
    if (ai?.id) ids.add(ai.id);
  }
  return ids;
};

/**
 * Roster lines for the system prompt: AIs that have posted in what the model
 * can see (window or digest) first, then the silent rest. Returns "" when
 * there is nobody else. Each handle appears once, so the split costs only
 * the two labels over a flat list.
 */
export const buildRosterSection = (
  otherAIs: OrchestratorAIService[],
  postedAIIds: Set<string>,
): string => {
  const active: string[] = [];
  const silent: string[] = [];
  for (const ai of otherAIs) {
    const description = describeParticipant(ai);
    if (!description) continue;
    (ai.id && postedAIIds.has(ai.id) ? active : silent).push(description);
  }

  const lines = [
    active.length > 0
      ? `${SYSTEM_PROMPT.ROSTER_ACTIVE} ${active.join(", ")}`
      : "",
    silent.length > 0
      ? `${SYSTEM_PROMPT.ROSTER_SILENT} ${silent.join(", ")}`
      : "",
  ].filter(Boolean);

  return lines.length > 0
    ? [SYSTEM_PROMPT.ROSTER_HEADER, ...lines].join("\n")
    : "";
};
