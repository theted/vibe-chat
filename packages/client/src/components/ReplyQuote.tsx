/**
 * ReplyQuote - compact quote of the message an AI is replying to, rendered
 * above the reply content. Falls back to a sender-only line when the quoted
 * message has scrolled out of the loaded history.
 */

import type { Message } from "@/types";

const QUOTE_MAX_LENGTH = 140;

const QUOTE_CONTAINER_CLASSES =
  "mb-2 rounded-lg border-l-2 border-primary-400 bg-slate-50 px-3 py-1.5 text-sm dark:border-primary-500/70 dark:bg-slate-800/60";
const QUOTE_SENDER_CLASSES =
  "font-semibold text-primary-600 dark:text-primary-300";
const QUOTE_CONTENT_CLASSES =
  "truncate text-slate-500 dark:text-slate-400";

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
