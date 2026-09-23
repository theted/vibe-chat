/**
 * ReplyQuote - compact quote of the message an AI is replying to, rendered
 * above the reply content. Falls back to a sender-only line when the quoted
 * message has scrolled out of the loaded history.
 */

import type { Message } from "@/types";

const QUOTE_MAX_LENGTH = 140;

const QUOTE_CONTAINER_CLASSES =
  "mb-1.5 flex min-w-0 items-baseline gap-2 border-l-2 border-line pl-2.5 text-[13px]";
const QUOTE_SENDER_CLASSES = "shrink-0 font-semibold text-muted";
const QUOTE_CONTENT_CLASSES = "truncate text-faint";

const excerpt = (content: string): string => {
  const trimmed = content.trim().replace(/\s+/g, " ");
  if (trimmed.length <= QUOTE_MAX_LENGTH) return trimmed;
  return `${trimmed.slice(0, QUOTE_MAX_LENGTH - 1).trimEnd()}…`;
};

interface ReplyQuoteProps {
  quotedMessage?: Message;
  fallbackSender?: string | null;
}

const ReplyQuote = ({ quotedMessage, fallbackSender }: ReplyQuoteProps) => {
  const sender =
    quotedMessage?.displayName || quotedMessage?.sender || fallbackSender;
  if (!sender) return null;

  return (
    <div className={QUOTE_CONTAINER_CLASSES}>
      <span className={QUOTE_SENDER_CLASSES}>↩ {sender}</span>
      {quotedMessage && (
        <div className={QUOTE_CONTENT_CLASSES}>
          {excerpt(quotedMessage.content)}
        </div>
      )}
    </div>
  );
};

export default ReplyQuote;
