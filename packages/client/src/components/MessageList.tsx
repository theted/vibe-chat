/**
 * MessageList - the transcript rows. Resolves each reply's quote against the
 * loaded history and lets a quote jump to the message it answers.
 */

import { useMemo } from "react";
import { useJumpToMessage } from "@/hooks/useJumpToMessage";
import { getMentionableUsernames } from "@/utils/mentionablePeople";
import { isContinuation } from "@/utils/messageGrouping";
import ChatMessage from "./ChatMessage";
import type { AiParticipant } from "@/config/aiParticipants";
import type { Message, Participant } from "@/types";

interface MessageListProps {
  messages: Message[];
  messagesById: Map<string, Message>;
  aiParticipants: AiParticipant[];
  participants: Participant[];
  /** Starts a quote-reply; rows get no reply button without it */
  onReply?: (message: Message) => void;
}

const MessageList = ({
  messages,
  messagesById,
  aiParticipants,
  participants,
  onReply,
}: MessageListProps) => {
  const { highlightedId, jumpToMessage } = useJumpToMessage();
  const participantMentions = useMemo(
    () => getMentionableUsernames(participants, messages),
    [participants, messages],
  );

  if (messages.length === 0) {
    return (
      <div className="px-6 pt-[18vh] text-center">
        <p className="wordmark text-3xl sm:text-4xl">Nothing said yet.</p>
        <p className="mt-2 text-[15px] text-muted">
          Say hello, or type @ to bring a model in.
        </p>
      </div>
    );
  }

  return messages.map((message, index) => (
    <ChatMessage
      key={message.id}
      message={message}
      aiParticipants={aiParticipants}
      participantMentions={participantMentions}
      isContinuation={isContinuation(messages[index - 1], message)}
      quotedMessage={
        message.replyToMessageId
          ? messagesById.get(message.replyToMessageId)
          : undefined
      }
      onReply={onReply}
      onJumpToMessage={jumpToMessage}
      isHighlighted={highlightedId === message.id}
    />
  ));
};

export default MessageList;
