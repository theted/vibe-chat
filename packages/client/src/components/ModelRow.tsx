/**
 * ModelRow - one model in the sidebar: emoji, name and a typing mark. A
 * button when the list lets the model be picked (see getModelSelection).
 */

import { useHueFor } from "@/context/VoiceContext";
import { voiceStyle } from "@/utils/voice";
import Spinner from "./Spinner";
import type { ReactNode } from "react";

const ROW_CLASSES =
  "flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-left text-sm transition-colors";

interface ModelRowProps {
  name: string;
  emoji?: string;
  voiceKey: string;
  isTyping: boolean;
  isPrivatePartner: boolean;
  /** Talking rows name the model in its colour; the full list only shows a dot */
  showVoiceName?: boolean;
  /** Says what picking the row does */
  title?: string;
  onSelect?: () => void;
  testId?: string;
}

const ModelRow = ({
  name,
  emoji,
  voiceKey,
  isTyping,
  isPrivatePartner,
  showVoiceName = false,
  title,
  onSelect,
  testId,
}: ModelRowProps) => {
  const hue = useHueFor()(voiceKey);
  const isVoiced = showVoiceName || isPrivatePartner;

  const content: ReactNode = (
    <>
      <span className="w-5 shrink-0 text-center" aria-hidden="true">
        {emoji || "🤖"}
      </span>
      <span
        className={`min-w-0 flex-1 truncate ${
          isVoiced ? "font-medium text-voice" : "text-fg"
        } ${isPrivatePartner ? "font-semibold" : ""}`}
        data-testid={testId}
      >
        {name}
      </span>
      {isTyping ? (
        <Spinner hue={hue} label={`${name} is typing`} />
      ) : (
        !isVoiced && (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-voice"
            aria-hidden="true"
          />
        )
      )}
    </>
  );

  return (
    <li style={voiceStyle(hue)}>
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          className={`${ROW_CLASSES} ${
            isPrivatePartner ? "bg-voice-soft" : "hover:bg-raised"
          }`}
          aria-current={isPrivatePartner ? "true" : undefined}
          title={title}
        >
          {content}
        </button>
      ) : (
        <div
          className={`${ROW_CLASSES} ${isPrivatePartner ? "bg-voice-soft" : ""}`}
          title={title}
        >
          {content}
        </div>
      )}
    </li>
  );
};

export default ModelRow;
