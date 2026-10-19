/**
 * useQuoteReply - the message the composer is quote-replying to. Kept as an
 * id and looked up in the loaded messages, so a reply whose message left the
 * list (another room, /clear) drops instead of quoting something not shown.
 */

import { useCallback, useState } from "react";
import type { Message } from "@/types";

export const useQuoteReply = (
  messagesById: Map<string, Message>,
  onSendMessage: (content: string, replyToMessageId?: string) => void,
) => {
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const replyingTo = replyToId ? (messagesById.get(replyToId) ?? null) : null;

  const startReply = useCallback(
    (message: Message) => setReplyToId(message.id),
    [],
  );
  const cancelReply = useCallback(() => setReplyToId(null), []);
  const sendMessage = useCallback(
    (content: string) => {
      if (replyingTo) {
        onSendMessage(content, replyingTo.id);
        setReplyToId(null);
      } else {
        onSendMessage(content);
      }
    },
    [onSendMessage, replyingTo],
  );

  return { replyingTo, startReply, cancelReply, sendMessage };
};
