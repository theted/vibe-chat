/**
 * ChatHeader - wordmark, room topic, connection state and the two header
 * actions (join as guest, settings).
 */

import Icon from "./Icon";

const ICON_BUTTON_CLASSES =
  "flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-fg";

interface ChatHeaderProps {
  topic?: string;
  isConnected: boolean;
  isAuthenticated: boolean;
  onLoginOpen: () => void;
  onSettingsOpen: () => void;
  /** Opens the participants drawer on screens without the sidebar */
  onParticipantsOpen: () => void;
  participantCount: number;
}

const ChatHeader = ({
  topic,
  isConnected,
  isAuthenticated,
  onLoginOpen,
  onSettingsOpen,
  onParticipantsOpen,
  participantCount,
}: ChatHeaderProps) => (
  <header className="flex h-14 shrink-0 items-center gap-4 border-b border-line px-4 sm:px-6">
    <div className="flex min-w-0 flex-1 items-baseline gap-3">
      <h1 className="wordmark shrink-0 text-xl">Vibe chat</h1>
      {/* The server tracks a room topic and /topic changes it */}
      {topic && (
        <p className="truncate text-sm text-muted" title={topic}>
          {topic}
        </p>
      )}
    </div>

    <div className="flex shrink-0 items-center gap-1.5">
      {!isConnected && (
        <span
          className="mr-1 flex items-center gap-1.5 text-xs text-danger"
          role="status"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-danger" />
          Reconnecting
        </span>
      )}
      {!isAuthenticated && (
        <button
          type="button"
          onClick={onLoginOpen}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90"
          aria-label="Log in to chat"
        >
          <Icon name="login" className="h-4 w-4" />
          <span className="hidden sm:inline">Join chat</span>
        </button>
      )}
      <button
        type="button"
        onClick={onParticipantsOpen}
        className={`${ICON_BUTTON_CLASSES} w-auto gap-1.5 px-2 lg:hidden`}
        aria-label="Show people and models in the room"
      >
        <Icon name="participants" className="h-[18px] w-[18px]" />
        <span className="text-xs tabular-nums">{participantCount}</span>
      </button>
      <button
        type="button"
        onClick={onSettingsOpen}
        className={ICON_BUTTON_CLASSES}
        aria-label="Open settings menu"
        title="Settings"
      >
        <Icon name="cog" className="h-[18px] w-[18px]" />
      </button>
    </div>
  </header>
);

export default ChatHeader;
