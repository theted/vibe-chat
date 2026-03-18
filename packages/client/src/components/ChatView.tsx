import { useState } from "react";
import { DEFAULT_AI_PARTICIPANTS } from "@/config/aiParticipants";
import { useModal } from "@/hooks/useModal";
import ChatMessage from "./ChatMessage";
import MessageInput from "./MessageInput";
import ParticipantsList from "./ParticipantsList";
import TypingIndicator from "./TypingIndicator";
import SettingsModal from "./SettingsModal";
import LoginModal from "./LoginModal";
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
  const menu = useModal();
  const login = useModal();

  const [darkChatBg, setDarkChatBg] = useState(
    () => localStorage.getItem("chat-dark-bg") === "true"
  );
  const toggleDarkChatBg = () => {
    setDarkChatBg((prev) => {
      localStorage.setItem("chat-dark-bg", String(!prev));
      return !prev;
    });
  };

  return (
    <div className="flex items-start lg:items-center justify-center min-h-dvh lg:min-h-screen p-0 lg:p-6">
      <div className="glass-surface flex bg-white/95 backdrop-blur-xl lg:rounded-3xl lg:shadow-2xl max-w-7xl w-full h-dvh lg:h-auto lg:max-h-[95vh] overflow-hidden animate-fade-in lg:border lg:border-white/30 dark:bg-[rgba(0,22,32,0.80)] dark:border-teal-600/25 dark:shadow-[0_0_80px_rgba(0,100,130,0.25)]">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-600/90 to-slate-700/90 backdrop-blur-sm text-white p-3 sm:p-4 lg:p-6 lg:rounded-tl-3xl border-b border-white/25 dark:from-teal-900/85 dark:to-[rgba(0,18,28,0.92)] dark:border-teal-600/20">
            <div className="flex justify-between items-center gap-2 lg:gap-6">
              <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                <div className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Icon name="chat" className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-white" />
                </div>
                <div className="flex flex-col justify-center">
                  <h1 className="header-title header-title--compact">
                    Vibe Chat
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3">
                  {!isAuthenticated && (
                    <button
                      type="button"
                      onClick={login.open}
                      className="glass-btn bg-primary-400/80 hover:bg-primary-400 text-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 shadow-lg shadow-primary-500/30"
                      aria-label="Log in to chat"
                    >
                      <Icon name="login" className="w-4 h-4" />
                      <span className="hidden lg:inline">Log in</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleDarkChatBg}
                    className={`glass-btn px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-sm font-medium transition-all flex items-center ${
                      darkChatBg
                        ? "bg-teal-500/30 hover:bg-teal-500/40 text-teal-200 border border-teal-400/30 shadow-md shadow-teal-900/40"
                        : "bg-white/10 hover:bg-white/20 text-white/60 hover:text-white/80"
                    }`}
                    aria-label="Toggle deep dark background"
                    title="Toggle deep dark background"
                  >
                    <Icon name="sparkle" className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={menu.open}
                    className="glass-btn bg-white/10 hover:bg-white/20 text-white/80 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-sm font-medium transition-colors flex items-center dark:bg-teal-900/30 dark:hover:bg-teal-800/40 dark:text-teal-100 dark:border dark:border-teal-600/30"
                    aria-label="Open settings menu"
                    title="Open settings menu"
                  >
                    <Icon name="cog" className="w-4 h-4" />
                  </button>
                </div>
            </div>
          </div>

          <SettingsModal
            isOpen={menu.isOpen}
            isVisible={menu.isVisible}
            onClose={menu.close}
            onLoginOpen={login.open}
            theme={theme}
            toggleTheme={toggleTheme}
            isAuthenticated={isAuthenticated}
            onLogout={onLogout}
          />

          <LoginModal
            isOpen={login.isOpen}
            isVisible={login.isVisible}
            onClose={login.close}
            username={username}
            onUsernameChange={onUsernameChange}
            onJoin={onJoin}
            connectionStatus={connectionStatus}
          />

          <div
            className="flex-1 relative overflow-y-auto overflow-x-hidden no-scrollbar bg-gradient-to-b from-slate-50/30 to-white/40 dark:from-transparent dark:to-transparent min-h-0"
            ref={messagesContainerRef}
          >
            {/* Radial vignette — always-on teal depth effect, darker at edges */}
            <div className="absolute inset-0 chat-vignette pointer-events-none dark:block hidden" />
            {/* Deep vibrant teal overlay — fades in/out via opacity so gradient can cross-fade */}
            <div
              className={`absolute inset-0 chat-bg-deep pointer-events-none transition-opacity duration-700 ${darkChatBg ? "opacity-100" : "opacity-0"}`}
            />
            <div className="relative z-10 p-3 sm:p-5 lg:p-8 space-y-3 sm:space-y-5 lg:space-y-7">
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

          <div className="glass-surface border-t border-slate-100/50 bg-white/80 backdrop-blur-md p-2.5 sm:p-4 lg:p-8 space-y-2.5 sm:space-y-4 lg:space-y-6 lg:rounded-bl-3xl dark:bg-[rgba(0,18,28,0.88)] dark:border-teal-700/30">
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
                    onClick={login.open}
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
