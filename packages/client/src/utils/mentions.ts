import { DEFAULT_AI_PARTICIPANTS } from "@/config/aiParticipants";
import { AI_MENTION_MAPPINGS } from "@/constants/chat";
import type { AiParticipant } from "@/config/aiParticipants";

const BOUNDARY_REGEX = /[\s.,!?;:'")\]}]/;

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
    ])
  )
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
})();

const buildMentionCandidates = (
  aiParticipants: AiParticipant[] = []
): string[] => {
  const participantValues = aiParticipants.flatMap((participant) => [
    participant.name,
    participant.alias,
    participant.id,
  ]);

  return Array.from(
    new Set([...baseMentionCandidates, ...participantValues])
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
  aiParticipants: AiParticipant[] = []
): MentionMatch[] => {
  if (!text.includes("@")) return [];

  const candidates = buildMentionCandidates(aiParticipants);
  const matches: MentionMatch[] = [];

  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== "@") continue;

    if (text[index + 1] === "[") {
      const closingIndex = text.indexOf("]", index + 2);
      if (closingIndex > index + 1) {
        const textSlice = text.slice(index, closingIndex + 1);
        const mention = text.slice(index + 2, closingIndex).trim();
        matches.push({
          start: index,
          end: closingIndex + 1,
          text: textSlice,
          mention,
        });
        index = closingIndex;
        continue;
      }
    }

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

export const extractMentionsFromText = (
  text: string,
  aiParticipants: AiParticipant[] = []
): string[] =>
  findMentionMatches(text, aiParticipants)
    .map((match) => match.mention.toLowerCase())
    .filter(Boolean);
