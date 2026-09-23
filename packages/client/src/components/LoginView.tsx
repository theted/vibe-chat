/**
 * LoginView - standalone join screen: pick a name, with a read-only preview
 * of the room's recent conversation and who is in it.
 */

import type { FormEvent } from "react";
import { DEFAULT_AI_PARTICIPANTS } from "@/config/aiParticipants";
import ChatMessage from "./ChatMessage";
import Icon from "./Icon";
import ParticipantsList from "./ParticipantsList";
import type { LoginViewProps } from "@/types";

const LoginView = ({
  connectionStatus,
  toggleTheme,
  theme,
  username,
  onUsernameChange,
  onJoin,
  error,
  previewMessages = [],
  previewParticipants = [],
  previewAiParticipants = [],
}: LoginViewProps) => {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onJoin?.(event);
  };

  const aiParticipants =
    previewAiParticipants.length > 0
      ? previewAiParticipants
      : DEFAULT_AI_PARTICIPANTS;

  return (
    <div className="flex min-h-dvh bg-canvas text-fg">
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-end gap-3 px-4 sm:px-6">
          <span
            className="flex items-center gap-1.5 text-xs text-muted"
            role="status"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connectionStatus.connected
                  ? "bg-emerald-400"
                  : "animate-pulse bg-danger"
              }`}
            />
            {connectionStatus.connected ? "Connected" : "Connecting..."}
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-fg"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            <Icon
              name={theme === "dark" ? "sun" : "moon"}
              className="h-[18px] w-[18px]"
            />
          </button>
        </header>

        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-10 pt-[12vh] sm:px-6">
          <h1 className="wordmark text-5xl sm:text-6xl">Vibe chat</h1>
          <p className="mt-3 text-lg text-muted">Group chat with AIs.</p>

          {error && (
            <p
              className="mt-6 text-sm text-danger animate-rise-in"
              role="alert"
            >
              {error}
            </p>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-8 flex flex-col gap-2 sm:flex-row"
          >
            <input
              type="text"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              placeholder="Enter your username (will be saved)"
              aria-label="Username"
              maxLength={50}
              pattern="[a-zA-Z0-9_-]+"
              title="Letters, numbers, dash and underscore only"
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-4 py-2.5 text-[15px] text-fg placeholder:text-faint focus:border-accent focus:ring-0"
              required
            />
            <button
              type="submit"
              disabled={!connectionStatus.connected || !username.trim()}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:bg-raised disabled:text-faint"
            >
              Join chat
            </button>
          </form>

          {previewMessages.length > 0 && (
            <section className="mt-14 animate-fade-in">
              <h2 className="mb-2 font-display text-sm font-semibold text-muted">
                Happening in the room
              </h2>
              <div className="thin-scrollbar max-h-80 overflow-y-auto rounded-xl border border-line bg-surface pb-4">
                {previewMessages.map((message) => (
                  <ChatMessage
                    key={message.id || `${message.timestamp}-${message.sender}`}
                    message={message}
                    aiParticipants={aiParticipants}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <ParticipantsList
        participants={previewParticipants}
        aiParticipants={aiParticipants}
        typingUsers={[]}
        typingAIs={[]}
        isVisible={true}
      />
    </div>
  );
};

export default LoginView;
