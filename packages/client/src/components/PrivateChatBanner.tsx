/**
 * PrivateChatBanner - Header strip shown while the user is in a private chat,
 * naming the models in it (each in its own voice), offering a way to add
 * more, and the way back to the main room.
 */

import { Fragment } from "react";
import { useHueFor, useVoiceStyle } from "@/context/VoiceContext";
import { getModelVoiceKey, voiceStyle } from "@/utils/voice";
import Icon from "./Icon";
import type { AiParticipant } from "@/config/aiParticipants";

interface PrivateChatBannerProps {
  ais: AiParticipant[];
  onLeave: () => void;
  /** Opens the models list; only shown where the sidebar is hidden */
  onAddModels?: () => void;
}

/** A big group names this many models, then says how many more there are */
const MAX_NAMED_MODELS = 3;

const BUTTON_CLASSES =
  "flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-muted transition-colors hover:bg-raised hover:text-fg";

/** ", " between names and " and " before the last, as the names are read. */
const separatorBefore = (index: number, count: number): string => {
  if (index === 0) return "";
  return index === count - 1 ? " and " : ", ";
};

const PrivateChatBanner = ({
  ais,
  onLeave,
  onAddModels,
}: PrivateChatBannerProps) => {
  const [firstAi] = ais;
  const voice = useVoiceStyle(firstAi ? getModelVoiceKey(firstAi) : null);
  const hueFor = useHueFor();
  const isGroup = ais.length > 1;
  // "and 1 more" reads worse than the name it hides
  const namedAis =
    ais.length > MAX_NAMED_MODELS + 1 ? ais.slice(0, MAX_NAMED_MODELS) : ais;
  const unnamedCount = ais.length - namedAis.length;
  const listLength = namedAis.length + (unnamedCount > 0 ? 1 : 0);

  return (
    <div
      className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-voice-soft px-4 py-2 sm:px-6"
      style={voice}
      data-testid="private-chat-banner"
    >
      <div className="flex min-w-0 items-center gap-2.5 text-sm">
        <span aria-hidden="true">
          {isGroup ? "🔒" : firstAi?.emoji || "🔒"}
        </span>
        <p
          className="truncate"
          title={
            unnamedCount > 0 ? ais.map((ai) => ai.name).join(", ") : undefined
          }
        >
          <span className="font-semibold text-fg">Private chat</span>
          {ais.length > 0 && " with "}
          {namedAis.map((ai, index) => (
            <Fragment key={ai.id}>
              {separatorBefore(index, listLength)}
              <span
                className="font-semibold text-voice"
                style={voiceStyle(hueFor(getModelVoiceKey(ai)))}
              >
                {ai.name}
              </span>
            </Fragment>
          ))}
          {unnamedCount > 0 &&
            `${separatorBefore(listLength - 1, listLength)}${unnamedCount} more`}
          <span className="hidden text-muted sm:inline">
            {isGroup
              ? ". Only you and these models."
              : ". Only you two, one reply per message."}
          </span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {onAddModels && (
          // Icon-only on phones, so the names keep the room they need
          <button
            type="button"
            onClick={onAddModels}
            className={`${BUTTON_CLASSES} lg:hidden`}
            aria-label="Add models"
            title="Add models"
            data-testid="add-private-models"
          >
            <Icon name="plus" className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            <span className="hidden sm:inline">Add models</span>
          </button>
        )}
        <button
          type="button"
          onClick={onLeave}
          className={BUTTON_CLASSES}
          data-testid="leave-private-chat"
        >
          <Icon name="chevron-right" className="h-3.5 w-3.5 rotate-180" />
          <span className="sm:hidden">Main room</span>
          <span className="hidden sm:inline">Back to main room</span>
        </button>
      </div>
    </div>
  );
};

export default PrivateChatBanner;
