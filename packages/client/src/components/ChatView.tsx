import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { DEFAULT_AI_PARTICIPANTS } from "@/config/aiParticipants";
import ChatMessage from "./ChatMessage";
import MessageInput from "./MessageInput";
import ParticipantsList from "./ParticipantsList";
import TypingIndicator from "./TypingIndicator";
import Icon from "./Icon";
import type { ChatViewProps } from "@/types";

const ChatView = ({
  theme,
  toggleTheme,
  connectionStatus,
  roomInfo,
  username,
  isAuthenticated,
  participants,
  aiParticipants = [],
  messages,
  typingUsers,
  typingAIs,
  showScrollButton,
  onScrollToBottom,
  onLogout,
  onJoin,
  onUsernameChange,
  onSendMessage,
  onAIMention,
  onTypingStart,
  onTypingStop,
  onPrivateConversationStart,
  error,
  messagesEndRef,
  messagesContainerRef,
}: ChatViewProps) => {
  const aiParticipantList =
    aiParticipants.length > 0 ? aiParticipants : DEFAULT_AI_PARTICIPANTS;
  const aiParticipantCount = aiParticipantList.length;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const loginInputRef = useRef<HTMLInputElement>(null);
  const displayName = username.trim() ? username : "Guest";
  const isGuest = !username.trim();

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isLoginOpen) {
      return undefined;
    }

    loginInputRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsLoginOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLoginOpen]);

  const handleLoginSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim()) {
      loginInputRef.current?.focus();
      return;
    }
    onJoin(event);
    setIsLoginOpen(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="flex bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden animate-fade-in border border-white/30 dark:bg-slate-900/90 dark:border-slate-800">
        <div className="flex-1 flex flex-col">
          <div className="bg-gradient-to-r from-slate-600/90 to-slate-700/90 backdrop-blur-sm text-white p-6 rounded-tl-3xl border-b border-white/10 dark:from-slate-800/90 dark:to-slate-900/90 dark:border-slate-800/60">
            <div className="flex justify-between items-stretch gap-6 flex-wrap">
              <div className="flex items-center gap-4 self-stretch">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Icon name="chat" className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col justify-center">
                  <h1 className="header-title header-title--compact">
                    Vibe Chat
                  </h1>
                  {/* <div className="text-slate-300/90 text-xs uppercase tracking-[0.24em] mt-2 flex items-center gap-2">
                    <Icon name="topic" className="w-4 h-4" />
                    <span>{roomInfo.topic}</span>
                    <span aria-hidden="true">•</span>
                    <span>{displayName}</span>
                    {isGuest && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-white/70">
                        Guest
                      </span>
                    )}
                  </div> */}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 self-stretch">
                <div className="flex items-center gap-3 flex-wrap justify-end">
                  {!isAuthenticated && (
                    <button
                      type="button"
                      onClick={() => setIsLoginOpen(true)}
                      className="bg-primary-400/80 hover:bg-primary-400 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-primary-500/30"
                      aria-label="Log in to chat"
                    >
                      <Icon name="login" className="w-4 h-4" />
                      <span className="hidden sm:inline">Log in</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen(true)}
                    className="bg-white/10 hover:bg-white/20 text-white/80 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 dark:bg-slate-900/60 dark:hover:bg-slate-900/80 dark:text-slate-200 dark:border dark:border-slate-700"
                    aria-label="Open settings menu"
                    title="Open settings menu"
                  >
                    <Icon name="cog" className="w-4 h-4" />
                  </button>
                  {/* <div className="text-primary-200 text-xs dark:text-slate-300">
                    {`${participants.length} user${
                      participants.length !== 1 ? "s" : ""
                    } + ${aiParticipantCount} AI${
                      aiParticipantCount !== 1 ? "s" : ""
                    }`}
                  </div> */}
                </div>
                {/* connection indicator */}
                {/* <div className="flex items-center gap-2 text-sm text-slate-100/80 dark:text-slate-200/80">
                  <div
                    className={`w-2 h-2 rounded-full transition-colors ${
                      connectionStatus.connected
                        ? "bg-green-400"
                        : "bg-red-400 animate-pulse"
                    }`}
                  ></div>
                  <span>
                    {connectionStatus.connected
                      ? "Connected"
                      : "Reconnecting..."}
                  </span>
                </div> */}
              </div>
            </div>
          </div>
          {isMenuOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in"
                role="button"
                tabIndex={-1}
                aria-label="Close settings menu"
                onClick={() => setIsMenuOpen(false)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    setIsMenuOpen(false);
                  }
                }}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Settings"
                className="relative w-full max-w-sm rounded-2xl bg-white/95 p-6 shadow-2xl border border-white/40 backdrop-blur-xl animate-fade-in animate-scale-in dark:bg-slate-900/95 dark:border-slate-700/60"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                    <Icon name="cog" className="w-5 h-5 text-primary-500" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                      Quick actions
                    </p>
                    <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                      Settings
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-between gap-3 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-100"
                    title={`Switch to ${
                      theme === "dark" ? "light" : "dark"
                    } mode`}
                  >
                    <span className="flex items-center gap-2">
                      <Icon
                        name={theme === "dark" ? "sun" : "moon"}
                        className="w-4 h-4"
                      />
                      {theme === "dark" ? "Light mode" : "Dark mode"}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Toggle
                    </span>
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      to="/dashboard"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-center gap-2 rounded-xl border border-primary-200/70 bg-primary-50 px-4 py-3 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-500/40 dark:bg-primary-500/10 dark:text-primary-200 dark:hover:bg-primary-500/20"
                      title="Dashboard"
                      aria-label="Dashboard"
                    >
                      <Icon name="dashboard" className="w-5 h-5" />
                    </Link>
                    {isAuthenticated ? (
                      <button
                        type="button"
                        onClick={onLogout}
                        className="flex items-center justify-center gap-2 rounded-xl border border-rose-200/70 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                        title="Logout"
                        aria-label="Logout"
                      >
                        <Icon name="logout" className="w-5 h-5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          setIsLoginOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 rounded-xl border border-primary-200/70 bg-primary-50 px-4 py-3 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-100 dark:border-primary-500/40 dark:bg-primary-500/10 dark:text-primary-200 dark:hover:bg-primary-500/20"
                        title="Log in"
                        aria-label="Log in"
                      >
                        <Icon name="login" className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {isLoginOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
                role="button"
                tabIndex={-1}
                aria-label="Close login dialog"
                onClick={() => setIsLoginOpen(false)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    setIsLoginOpen(false);
                  }
                }}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Set your username"
                className="relative w-full max-w-md rounded-3xl bg-white/95 p-8 shadow-2xl border border-white/40 backdrop-blur-xl animate-fade-in animate-scale-in dark:bg-slate-900/95 dark:border-slate-700/60"
              >
                <div className="absolute -top-10 right-8 h-24 w-24 rounded-full bg-primary-500/20 blur-2xl" />
                <div className="absolute -bottom-8 left-8 h-24 w-24 rounded-full bg-indigo-500/20 blur-2xl" />
                <div className="relative flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                      Welcome to the room
                    </p>
                    <p className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
                      Pick your username
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLoginOpen(false)}
                    className="rounded-full border border-slate-200/60 bg-white/70 p-2 text-slate-500 transition hover:text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-300"
                    aria-label="Close login dialog"
                  >
                    <Icon name="x-mark" className="w-4 h-4" />
                  </button>
                </div>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                  Join the conversation with a display name so others can see
                  you in the room.
                </p>
                <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
                  <input
                    ref={loginInputRef}
                    type="text"
                    value={username}
                    onChange={(event) => onUsernameChange(event.target.value)}
                    placeholder="Enter your username"
                    maxLength={50}
                    pattern="[a-zA-Z0-9_-]+"
                    title="Username can only contain letters, numbers, dash, and underscore"
                    className="w-full rounded-2xl border border-slate-200/70 bg-white/80 px-5 py-3 text-base font-medium text-slate-800 shadow-inner outline-none transition focus:border-primary-300 focus:ring-2 focus:ring-primary-400/30 dark:border-slate-700/60 dark:bg-slate-900/70 dark:text-slate-100"
                    required
                  />
                  <button
                    type="submit"
                    disabled={!connectionStatus.connected || !username.trim()}
                    className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-primary-500 via-indigo-500 to-sky-500 px-6 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-white transition-all duration-300 disabled:from-slate-500 disabled:via-slate-600 disabled:to-slate-700 disabled:text-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
                  >
                    <span className="absolute inset-0 translate-y-full bg-gradient-to-r from-emerald-400/80 via-teal-400/80 to-cyan-400/80 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100" />
                    <span className="relative">Join Chat</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          <div
            className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-7 bg-gradient-to-b from-slate-50/30 to-white/40 dark:from-slate-900/50 dark:to-slate-900/20"
            ref={messagesContainerRef}
          >
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                aiParticipants={aiParticipantList}
                participants={participants}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <TypingIndicator typingUsers={typingUsers} typingAIs={typingAIs} />

          {showScrollButton && (
            <button
              className="fixed bottom-32 right-8 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 z-50 animate-bounce group dark:from-emerald-400 dark:to-teal-500"
              onClick={onScrollToBottom}
            >
              <Icon
                name="arrow-down"
                className="w-5 h-5 transform group-hover:translate-y-1 transition-transform duration-200"
              />
            </button>
          )}

          <div className="border-t border-slate-100/50 bg-white/80 backdrop-blur-md p-8 space-y-6 rounded-bl-3xl dark:bg-slate-900/90 dark:border-slate-800/60">
            {error && (
              <div className="bg-red-50/70 backdrop-blur-sm border border-red-200/50 text-red-800 px-6 py-4 rounded-2xl text-center animate-slide-up shadow-sm dark:bg-red-500/10 dark:border-red-400/40 dark:text-red-200">
                {error}
              </div>
            )}
            {!isAuthenticated && (
              <div className="flex flex-col gap-3 rounded-2xl border border-primary-200/60 bg-primary-50/80 px-5 py-4 text-sm text-primary-800 shadow-inner dark:border-primary-500/40 dark:bg-primary-500/10 dark:text-primary-100">
                <div className="flex items-center gap-3">
                  <Icon name="login" className="w-5 h-5 text-primary-500" />
                  <div>
                    <p className="font-semibold">You are viewing as a guest.</p>
                    <p className="text-xs text-primary-700/80 dark:text-primary-200/80">
                      Log in to send messages and mention the AIs.
                    </p>
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setIsLoginOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-primary-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white shadow-lg shadow-primary-500/30 transition hover:bg-primary-400"
                  >
                    <Icon name="login" className="w-4 h-4" />
                    Log in
                  </button>
                </div>
              </div>
            )}

            <MessageInput
              onSendMessage={onSendMessage}
              onAIMention={onAIMention}
              onTypingStart={onTypingStart}
              onTypingStop={onTypingStop}
              disabled={!connectionStatus.connected || !isAuthenticated}
            />
          </div>
        </div>

        <ParticipantsList
          participants={participants}
          aiParticipants={aiParticipantList}
          typingUsers={typingUsers}
          typingAIs={typingAIs}
          isVisible={true}
          onAISelect={onPrivateConversationStart}
        />
      </div>
    </div>
  );
};

export default ChatView;
