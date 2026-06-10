/**
 * Mention rendering helpers for chat messages: bold-code formatting for the
 * markdown pipeline and mention-chip nodes for plaintext messages.
 */

import { Fragment, type ReactNode } from "react";
import { findMentionMatches } from "@/utils/mentions";
import type { AiParticipant } from "@/config/aiParticipants";

/** Wraps known @mentions as **`mention`** so markdown renders them as chips. */
export const formatMentionsForMarkdown = (
  content: string,
  aiParticipants: AiParticipant[],
  participantMentions: string[],
): string => {
  if (typeof content !== "string" || !content.includes("@")) return content;

  const matches = findMentionMatches(content, aiParticipants, participantMentions);
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

/** Renders known @mentions in plaintext content as mention-chip spans. */
export const highlightMentions = (
  value: unknown,
  aiParticipants: AiParticipant[],
  participantMentions: string[],
): ReactNode => {
  let stringValue: string;
  if (typeof value !== "string") {
    if (Array.isArray(value)) {
      stringValue = value.join("");
    } else if (value == null) {
      return value as ReactNode;
    } else {
      stringValue = String(value);
    }
  } else {
    stringValue = value;
  }

  if (!stringValue.includes("@")) return stringValue;

  const matches = findMentionMatches(stringValue, aiParticipants, participantMentions);
  if (matches.length === 0) return stringValue;

  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  matches.forEach((match) => {
    if (match.start > lastIndex) {
      nodes.push(
        <Fragment key={`text-${key++}`}>
          {stringValue.slice(lastIndex, match.start)}
        </Fragment>,
      );
    }
    nodes.push(
      <span key={`mention-${key++}`} className="mention-chip">
        {match.text}
      </span>,
    );
    lastIndex = match.end;
  });

  if (lastIndex < stringValue.length) {
    nodes.push(
      <Fragment key={`text-${key++}`}>
        {stringValue.slice(lastIndex)}
      </Fragment>,
    );
  }

  return nodes;
};
