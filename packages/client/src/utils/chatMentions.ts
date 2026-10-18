/**
 * Mention formatting for the chat markdown pipeline: known @mentions become
 * bold code spans, which MarkdownCodeBlock renders as mention chips.
 */

import { findMentionMatches } from "@/utils/mentions";
import type { AiParticipant } from "@/config/aiParticipants";

/** Wraps known @mentions as **`mention`** so markdown renders them as chips. */
export const formatMentionsForMarkdown = (
  content: string,
  aiParticipants: AiParticipant[],
  participantMentions: string[],
): string => {
  if (typeof content !== "string" || !content.includes("@")) return content;

  const matches = findMentionMatches(
    content,
    aiParticipants,
    participantMentions,
  );
  if (matches.length === 0) return content;

  let formatted = "";
  let lastIndex = 0;

  matches.forEach((match) => {
    formatted += content.slice(lastIndex, match.start);
    formatted += `**\`${match.text}\`**`;
    lastIndex = match.end;
  });

  formatted += content.slice(lastIndex);
  return formatted;
};
