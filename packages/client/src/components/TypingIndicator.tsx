/**
 * TypingIndicator Component - one quiet line above the composer naming who
 * is writing. It always holds its height so the transcript doesn't jump.
 */

import Spinner from "./Spinner";
import type { TypingIndicatorProps, TypingParticipant } from "@/types";

const MAX_NAMED_TYPERS = 2;

const getDisplayName = (participant: TypingParticipant): string =>
  participant.displayName || participant.name || "Someone";

const Name = ({ children }: { children: string }) => (
  <span className="font-semibold text-fg">{children}</span>
);

const TypingIndicator = ({
  typingUsers = [],
  typingAIs = [],
}: TypingIndicatorProps) => {
  const otherTypingUsers = typingUsers.filter((user) => !user.isLocal);
  const allTyping: TypingParticipant[] = [...otherTypingUsers, ...typingAIs];
  const names = allTyping.map(getDisplayName);

  const renderText = () => {
    if (names.length === 1)
      return (
        <>
          <Name>{names[0]}</Name> is typing
        </>
      );
    if (names.length === MAX_NAMED_TYPERS) {
      return (
        <>
          <Name>{names[0]}</Name> and <Name>{names[1]}</Name> are typing
        </>
      );
    }
    return (
      <>
        <Name>{names[0]}</Name> and {names.length - 1} others are typing
      </>
    );
  };

  return (
    <div
      className="flex h-5 items-center gap-2 px-1 text-xs text-muted"
      aria-live="polite"
    >
      {allTyping.length > 0 && (
        <>
          <Spinner />
          <span className="truncate">{renderText()}</span>
        </>
      )}
    </div>
  );
};

export default TypingIndicator;
