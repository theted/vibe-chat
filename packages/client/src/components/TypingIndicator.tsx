/**
 * TypingIndicator Component - one quiet line above the composer naming who
 * is writing, each model in its voice colour. It always holds its height so
 * the transcript doesn't jump.
 */

import { useMemo } from "react";
import { HUMAN_VOICE_HUE } from "@/config/voices";
import { findTypingAiParticipant } from "@/utils/participants";
import { getVoiceHue, voiceStyle } from "@/utils/voice";
import Spinner from "./Spinner";
import type { TypingIndicatorProps, TypingParticipant } from "@/types";

const MAX_NAMED_TYPERS = 2;

interface Typer {
  name: string;
  hue: number;
  isAI: boolean;
}

const getDisplayName = (participant: TypingParticipant): string =>
  participant.displayName || participant.name || "Someone";

const Name = ({ typer }: { typer: Typer }) => (
  <span
    className={`font-semibold ${typer.isAI ? "text-voice" : "text-fg"}`}
    style={voiceStyle(typer.hue)}
  >
    {typer.name}
  </span>
);

const TypingIndicator = ({
  typingUsers = [],
  typingAIs = [],
  aiParticipants = [],
}: TypingIndicatorProps) => {
  const typers = useMemo<Typer[]>(
    () => [
      ...typingUsers
        .filter((user) => !user.isLocal)
        .map((user) => ({
          name: getDisplayName(user),
          hue: HUMAN_VOICE_HUE,
          isAI: false,
        })),
      ...typingAIs.map((ai) => {
        const participant = findTypingAiParticipant(ai, aiParticipants);
        return {
          name: getDisplayName(ai),
          hue: getVoiceHue(participant?.provider ?? getDisplayName(ai)),
          isAI: true,
        };
      }),
    ],
    [typingUsers, typingAIs, aiParticipants],
  );

  // Models first: the bars should show the voices about to speak
  const hues = useMemo(
    () => [
      ...typers.filter((typer) => typer.isAI).map((typer) => typer.hue),
      ...typers.filter((typer) => !typer.isAI).map((typer) => typer.hue),
    ],
    [typers],
  );

  const renderText = () => {
    if (typers.length === 1)
      return (
        <>
          <Name typer={typers[0]} /> is typing
        </>
      );
    if (typers.length === MAX_NAMED_TYPERS) {
      return (
        <>
          <Name typer={typers[0]} /> and <Name typer={typers[1]} /> are typing
        </>
      );
    }
    return (
      <>
        <Name typer={typers[0]} /> and {typers.length - 1} others are typing
      </>
    );
  };

  return (
    <div
      className="flex h-5 items-center gap-2 px-1 text-xs text-muted"
      aria-live="polite"
    >
      {typers.length > 0 && (
        <>
          <Spinner hues={hues} />
          <span className="truncate">{renderText()}</span>
        </>
      )}
    </div>
  );
};

export default TypingIndicator;
