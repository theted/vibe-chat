/**
 * "Did you mean" hints for the composer: near-miss @mentions in a draft and
 * the handle each most likely meant (matching rules live in ai-configs).
 * Spellings that already route, like `@gpt-6.2-astra`, get no hint.
 */

import {
  findMentionSuggestions,
  toMentionHandle,
  type MentionSuggestion,
} from "@ai-chat/ai-configs";
import { getActiveParticipants } from "@/config/aiParticipants";
import type { AiParticipant } from "@/config/aiParticipants";

// A token touching the end of the draft is still being typed (the @ picker
// is helping with it), so it isn't judged yet
const TRAILING_TOKEN_REGEX = /@[^\s@]*$/;

/** Handles a person can mention: live models plus people in the room. */
export const getMentionHandles = (
  aiParticipants: AiParticipant[] | undefined,
  usernames: string[] = [],
): string[] => {
  const models = (aiParticipants ?? getActiveParticipants()).filter(
    ({ status }) => status !== "inactive",
  );
  return [
    ...new Set([
      ...models.map(({ alias }) => toMentionHandle(alias)),
      ...usernames,
    ]),
  ].filter(Boolean);
};

/** Near-miss mentions in a draft, ignoring the one still being typed. */
export const getDraftMentionSuggestions = (
  draft: string,
  handles: string[],
): MentionSuggestion[] =>
  findMentionSuggestions(draft.replace(TRAILING_TOKEN_REGEX, ""), handles);

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Swap every `@token` in the draft for `@suggestion`, leaving longer tokens
 * that merely start with it (and emails or URLs) untouched.
 */
export const applyMentionSuggestion = (
  draft: string,
  { token, suggestion }: MentionSuggestion,
): string =>
  draft.replace(
    new RegExp(
      `(^|[^\\w./%+=-])@${escapeRegex(token)}(?=$|[\\s.,!?;:'")\\]}])`,
      "g",
    ),
    (_, before: string) => `${before}@${suggestion}`,
  );
