/**
 * UI mention matcher. Deliberately separate from the orchestrator's
 * token parser (ai-chat-core stringUtils.createMentionTokenRegex):
 * this one matches known multi-word display names (e.g. "@Claude Opus 4.8")
 * against a candidate list for highlighting, which a single-token regex
 * cannot express.
 */
import { DEFAULT_AI_PARTICIPANTS } from "@/config/aiParticipants";
import { AI_MENTION_MAPPINGS } from "@/constants/chat";
import { normalizeAliasKey } from "@/utils/ai";
import { getModelVoiceKey } from "@/utils/voice";
import type { AiParticipant } from "@/config/aiParticipants";

const BOUNDARY_REGEX = /[\s.,!?;:'")\]}]/;
// An @ glued to these is part of an email or URL path (medium.com/@someone),
// and wrapping it as a mention would break the link around it
const URL_OR_EMAIL_CHAR_REGEX = /[\w./%+=-]/;

export interface MentionMatch {
  start: number;
  end: number;
  text: string;
  mention: string;
}

const baseMentionCandidates = (() => {
  const baseParticipants = DEFAULT_AI_PARTICIPANTS.flatMap((participant) => [
    participant.name,
    participant.alias,
    participant.id,
  ]);
  return Array.from(
    new Set([
      ...Object.keys(AI_MENTION_MAPPINGS),
      ...Object.values(AI_MENTION_MAPPINGS),
      ...baseParticipants,
    ]),
  )
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
})();

const buildMentionCandidates = (
  aiParticipants: AiParticipant[] = [],
  extraCandidates: Array<string | null | undefined> = [],
): string[] => {
  const participantValues = aiParticipants.flatMap((participant) => [
    participant.name,
    participant.alias,
    participant.id,
  ]);

  const extraValues = extraCandidates
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return Array.from(
    new Set([...baseMentionCandidates, ...participantValues, ...extraValues]),
  )
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => b.length - a.length);
};

const hasBoundary = (value: string | undefined): boolean => {
  if (!value) return true;
  return BOUNDARY_REGEX.test(value);
};

export const findMentionMatches = (
  text: string,
  aiParticipants: AiParticipant[] = [],
  extraCandidates: Array<string | null | undefined> = [],
): MentionMatch[] => {
  if (!text.includes("@")) return [];

  const candidates = buildMentionCandidates(aiParticipants, extraCandidates);
  const matches: MentionMatch[] = [];

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "@") continue;
    if (index > 0 && URL_OR_EMAIL_CHAR_REGEX.test(text[index - 1])) continue;

    const remaining = text.slice(index + 1);
    const remainingLower = remaining.toLowerCase();
    const candidate = candidates.find((option) => {
      const optionLower = option.toLowerCase();
      if (!remainingLower.startsWith(optionLower)) {
        return false;
      }
      return hasBoundary(remaining[option.length]);
    });

    if (candidate) {
      const mentionEnd = index + 1 + candidate.length;
      const mentionText = text.slice(index + 1, mentionEnd).trim();
      matches.push({
        start: index,
        end: mentionEnd,
        text: text.slice(index, mentionEnd),
        mention: mentionText,
      });
      index = mentionEnd - 1;
    }
  }

  return matches;
};

/**
 * Voice key of the model an @mention names (shorthand aliases included), so
 * the chip can wear that model's colour. Null for people and unknowns.
 */
export const resolveMentionVoiceKey = (
  mention: string,
  aiParticipants: AiParticipant[] = [],
): string | null => {
  const bare = mention.replace(/^@/, "").trim().toLowerCase();
  if (!bare) return null;

  const canonical = Object.entries(AI_MENTION_MAPPINGS).find(
    ([alias]) => alias.toLowerCase() === bare,
  )?.[1];
  const targets = new Set(
    [bare, canonical].map((value) => normalizeAliasKey(value)).filter(Boolean),
  );

  const participant = [...aiParticipants, ...DEFAULT_AI_PARTICIPANTS].find(
    ({ id, alias, name }) =>
      [id, alias, name].some((value) => targets.has(normalizeAliasKey(value))),
  );
  return participant ? getModelVoiceKey(participant) : null;
};
