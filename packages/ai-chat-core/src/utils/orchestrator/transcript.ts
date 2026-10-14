/**
 * Turns a room's history into the message list one AI is prompted with.
 *
 * Every message from someone else becomes a user turn that starts with its
 * speaker's name; the AI's own earlier messages are its assistant turns.
 * Providers only see role + content, so without the labels every other AI's
 * message reads as something the model said itself, and it loses track of
 * who it is answering.
 *
 * The result always starts and ends on a user turn and alternates roles,
 * which every provider accepts (Anthropic, Gemini and Perplexity reject
 * anything else). The per-turn instruction goes in the final user turn
 * because some providers keep only the first system message.
 */

import { TRANSCRIPT } from "@/orchestrator/constants.js";
import type { Message } from "@/types/index.js";
import type { ContextMessage } from "@/types/orchestrator.js";
import type { OrchestratorAIService } from "./aiLookup.js";

type TranscriptRole = "user" | "assistant";

/** Name shown in front of a message, e.g. "Claude" or "Ada (human)". */
export const speakerLabel = (message: ContextMessage): string => {
  if (message.senderType === "system") return TRANSCRIPT.SYSTEM_LABEL;
  const name =
    (message.displayName || message.sender || "").trim() || "Someone";
  return message.senderType === "user"
    ? `${name}${TRANSCRIPT.HUMAN_SUFFIX}`
    : name;
};

const isOwnMessage = (
  message: ContextMessage,
  self: OrchestratorAIService,
): boolean => {
  if (message.senderType !== "ai") return false;
  if (message.aiId) return message.aiId === self.id;
  return Boolean(
    self.normalizedAlias && message.normalizedAlias === self.normalizedAlias,
  );
};

export const buildTranscript = (
  self: OrchestratorAIService,
  context: ContextMessage[],
  turnInstruction: string,
): Message[] => {
  const turns: Message[] = [];
  const append = (role: TranscriptRole, content: string) => {
    const last = turns[turns.length - 1];
    if (last?.role === role) {
      last.content = `${last.content}\n\n${content}`;
      return;
    }
    turns.push({ role, content });
  };

  for (const message of context) {
    const content = message.content?.trim();
    if (message.isInternal || !content) continue;
    if (isOwnMessage(message, self)) {
      append("assistant", content);
    } else {
      append("user", `[${speakerLabel(message)}] ${content}`);
    }
  }

  if (turns[0]?.role === "assistant") {
    turns.unshift({ role: "user", content: TRANSCRIPT.CONTINUATION_NOTE });
  }
  append("user", turnInstruction);

  return turns;
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Drop a "[Name]" or "Name:" label a model put in front of its own reply
 * after imitating the transcript format.
 */
export const stripOwnSpeakerLabel = (
  response: string,
  self: OrchestratorAIService,
): string => {
  const names = [self.displayName, self.name, self.alias]
    .map((name) => name?.trim())
    .filter((name): name is string => Boolean(name))
    .map(escapeRegExp);
  if (names.length === 0) return response;

  const name = `@?(?:${names.join("|")})`;
  const label = new RegExp(
    `^\\s*(?:\\[${name}(?:\\s*\\([^)]*\\))?\\]\\s*:?|${name}\\s*:)\\s*`,
    "i",
  );
  const stripped = response.replace(label, "");
  return stripped.trim() ? stripped : response;
};
