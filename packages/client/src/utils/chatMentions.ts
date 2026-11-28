/**
 * Mention formatting for the chat markdown pipeline: known @mentions become
 * code spans, which MarkdownCodeBlock renders as mention chips.
 */

import { findMentionMatches } from "@/utils/mentions";
import type { AiParticipant } from "@/config/aiParticipants";

// Fenced blocks and inline code spans. A mention inside one is already code
// (an inline `@Theted` chips on its own); wrapping it again would put stray
// backticks into the code.
const CODE_REGION_REGEX = /(`{3,}|~{3,})[\s\S]*?(?:\1|$)|`[^`\n]+`/g;

interface TextRange {
  start: number;
  end: number;
}

const findCodeRanges = (content: string): TextRange[] =>
  Array.from(content.matchAll(CODE_REGION_REGEX), (match) => ({
    start: match.index,
    end: match.index + match[0].length,
  }));

const isInsideRange = (index: number, ranges: TextRange[]): boolean =>
  ranges.some(({ start, end }) => index >= start && index < end);

/**
 * Wraps known @mentions outside code as `mention` so markdown renders them as
 * chips. Plain backticks rather than bold code, so a mention someone already
 * bolded (`**@Theted**`) still parses as bold around the chip.
 */
export const formatMentionsForMarkdown = (
  content: string,
  aiParticipants: AiParticipant[],
  participantMentions: string[],
): string => {
  if (typeof content !== "string" || !content.includes("@")) return content;

  const codeRanges = findCodeRanges(content);
  const matches = findMentionMatches(
    content,
    aiParticipants,
    participantMentions,
  ).filter(({ start }) => !isInsideRange(start, codeRanges));
  if (matches.length === 0) return content;

  let formatted = "";
  let lastIndex = 0;

  matches.forEach((match) => {
    formatted += content.slice(lastIndex, match.start);
    formatted += `\`${match.text}\``;
    lastIndex = match.end;
  });

  formatted += content.slice(lastIndex);
  return formatted;
};
