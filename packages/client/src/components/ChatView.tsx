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

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="flex bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden animate-fade-in border border-white/30 dark:bg-slate-900/90 dark:border-slate-800">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
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
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 self-stretch">
                <div className="flex items-center gap-3 flex-wrap justify-end">
                  {!isAuthenticated && (
                    <button
                      type="button"
                      onClick={login.open}
                      className="bg-primary-400/80 hover:bg-primary-400 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-primary-500/30"
                      aria-label="Log in to chat"
                    >
                      <Icon name="login" className="w-4 h-4" />
                      <span className="hidden sm:inline">Log in</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={menu.open}
                    className="bg-white/10 hover:bg-white/20 text-white/80 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 dark:bg-slate-900/60 dark:hover:bg-slate-900/80 dark:text-slate-200 dark:border dark:border-slate-700"
                    aria-label="Open settings menu"
                    title="Open settings menu"
                  >
                    <Icon name="cog" className="w-4 h-4" />
                  </button>
                </div>
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
            className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar p-8 space-y-7 bg-gradient-to-b from-slate-50/30 to-white/40 dark:from-slate-900/50 dark:to-slate-900/20"
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
