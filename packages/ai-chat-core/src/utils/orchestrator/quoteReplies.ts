/**
 * Quote-replies: the snapshot a reply keeps of the message it quotes, and
 * the [reply #n] marker a model writes to quote one. n is the number of the
 * message's transcript label (see buildTranscript).
 */

import { QUOTE_REPLY } from "@/orchestrator/constants.js";
import type { ContextMessage } from "@/types/orchestrator.js";
import { excerptForQuote } from "./responseUtils.js";

export type ReplyFields = Pick<
  ContextMessage,
  "replyToMessageId" | "replyToSender" | "replyToExcerpt"
>;

// Matched anywhere, not just at the start: some models open with a greeting
const REPLY_MARKER_REGEX = /\[reply\s*#?(\d+)\]\s*/gi;

/** Transcript number of `context[index]`; resolveReplyRef reverses it. */
export const transcriptRef = (index: number): number => index + 1;

/** Fields that make a message quote `quoted`, with a snapshot of it. */
export const toReplyFields = (quoted: ContextMessage): ReplyFields => ({
  replyToMessageId: quoted.id ?? null,
  replyToSender: quoted.displayName || quoted.sender || null,
  replyToExcerpt:
    excerptForQuote(quoted.content ?? "", QUOTE_REPLY.EXCERPT_LENGTH) || null,
});

/** Take the [reply #n] marker out of a model's reply, keeping the first n. */
export const extractReplyRef = (
  response: string,
): { text: string; ref: number | null } => {
  const [first] = response.matchAll(REPLY_MARKER_REGEX);
  return {
    text: response.replace(REPLY_MARKER_REGEX, ""),
    ref: first ? Number(first[1]) : null,
  };
};

/** The message a [reply #n] marker points at in the context the model saw. */
export const resolveReplyRef = (
  context: ContextMessage[],
  ref: number | null,
): ContextMessage | null => {
  if (ref === null) return null;
  const quoted = context[ref - 1];
  return quoted?.id && !quoted.isInternal && quoted.senderType !== "system"
    ? quoted
    : null;
};
