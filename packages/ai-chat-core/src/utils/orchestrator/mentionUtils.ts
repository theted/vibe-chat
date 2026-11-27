import {
  resolveMentionTarget,
  suggestMentionHandle,
} from "@ai-chat/ai-configs";
import { MENTION_LIMITS } from "@/orchestrator/constants.js";
import {
  createMentionTokenRegex,
  normalizeAlias,
  parseMentions,
} from "@/utils/stringUtils.js";

// Splits "gpt-6-2-astr," into the handle part and the punctuation after it
const TRAILING_PUNCTUATION_SPLIT_REGEX = /^(.*?)([.,!?;:'")\]}]*)$/;
const URL_OR_EMAIL_CHAR_REGEX = /[\w./%+=-]/;

/**
 * Whether a response actually @mentions the given handle (as a mention
 * token, not just the bare name). Used for prompt-driven mention telemetry:
 * the MENTION_TARGET instruction lets the model skip forced mentions, and
 * this measures how often it follows through.
 */
export const responseIncludesMention = (
  response: string,
  mentionHandle: string,
): boolean => {
  const bareHandle = mentionHandle.startsWith("@")
    ? mentionHandle.slice(1)
    : mentionHandle;
  // Same alias-resolution pipeline parseMentions applies to response tokens,
  // so "@chatgpt" in the response matches a "@GPT" target and vice versa
  const normalizedTarget = normalizeAlias(resolveMentionTarget(bareHandle));
  if (!normalizedTarget) return false;

  return parseMentions(response).normalized.includes(normalizedTarget);
};

/**
 * Demote @mentions of other AIs to plain text. Used in private 1-1 rooms,
 * where the prompt already asks for no hand-offs but the model may still
 * produce one — and a mention there would address someone who is not present.
 */
export const stripAIMentions = (
  response = "",
  isOtherAI: (normalizedToken: string) => boolean,
): string => {
  if (!response) return response;

  return response.replace(createMentionTokenRegex(), (match, token: string) => {
    if (!token) return match;
    const normalized = normalizeAlias(resolveMentionTarget(token));
    return normalized && isOtherAI(normalized) ? token : match;
  });
};

/**
 * Rewrite near-miss @mentions in an AI reply to the handle they meant
 * (`@gpt-6-2-astr` -> `@gpt-6-2-astra`), so the mention routes and the next
 * model copies the right spelling. Nobody can be asked "did you mean" on an
 * AI's behalf, so this only fires when suggestMentionHandle finds exactly
 * one close handle; spellings that already route loosely are left as written.
 * `handles` should hold people's names too, so a person is never "corrected"
 * into a model.
 */
export const correctNearMissMentions = (
  response = "",
  handles: readonly string[],
): string => {
  if (!response || handles.length === 0) return response;

  const pattern = createMentionTokenRegex();
  return response.replace(pattern, (match, token: string, offset: number) => {
    // An @ glued to a word is an email or URL path, not a mention
    if (offset > 0 && URL_OR_EMAIL_CHAR_REGEX.test(response[offset - 1])) {
      return match;
    }
    const [, core = "", trailing = ""] =
      token.match(TRAILING_PUNCTUATION_SPLIT_REGEX) ?? [];
    const suggestion = core ? suggestMentionHandle(core, handles) : null;
    return suggestion ? `@${suggestion}${trailing}` : match;
  });
};

/**
 * Keep at most `maxUniqueMentions` people @mentioned, each only once: later
 * repeats of the same handle and any extra handles become plain names.
 * Aliases resolve first, so "@chatgpt" and "@GPT" count as the same target.
 */
export const limitMentionsInResponse = (
  response = "",
  maxUniqueMentions: number = MENTION_LIMITS.MAX_UNIQUE_PER_RESPONSE,
): string => {
  if (!response || maxUniqueMentions < 1) {
    return response;
  }

  const seenMentions = new Set<string>();

  return response.replace(createMentionTokenRegex(), (match, token: string) => {
    if (!token) return match;

    const normalizedToken = normalizeAlias(resolveMentionTarget(token));
    if (!normalizedToken) return match;

    if (
      seenMentions.has(normalizedToken) ||
      seenMentions.size >= maxUniqueMentions
    ) {
      return token;
    }

    seenMentions.add(normalizedToken);
    return match;
  });
};
