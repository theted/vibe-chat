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
  participants,
  aiParticipants = [],
  messages,
  typingUsers,
  typingAIs,
  showScrollButton,
  onScrollToBottom,
  onLogout,
  onSendMessage,
  onAIMention,
  onTypingStart,
  onTypingStop,
  error,
  messagesEndRef,
  messagesContainerRef,
}: ChatViewProps) => {
  const aiParticipantList =
    aiParticipants.length > 0 ? aiParticipants : DEFAULT_AI_PARTICIPANTS;
  const aiParticipantCount = aiParticipantList.length;

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
                  <div className="text-slate-300/90 text-xs uppercase tracking-[0.24em] mt-2 flex items-center gap-2">
                    <Icon name="topic" className="w-4 h-4" />
                    <span>{roomInfo.topic}</span>
                    <span aria-hidden="true">•</span>
                    <span>{username}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 self-stretch flex-wrap justify-end">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="bg-white/10 hover:bg-white/20 text-white/80 px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 dark:bg-slate-900/60 dark:hover:bg-slate-900/80 dark:text-slate-200 dark:border dark:border-slate-700"
                    title={`Switch to ${
                      theme === "dark" ? "light" : "dark"
                    } mode`}
                  >
                    <Icon
                      name={theme === "dark" ? "sun" : "moon"}
                      className="w-4 h-4"
                    />
                    <span className="hidden sm:inline">
                      {theme === "dark" ? "Light mode" : "Dark mode"}
                    </span>
                  </button>
                </div>
                <Link
                  to="/dashboard"
                  className="bg-primary-800 hover:bg-primary-900 text-primary-100 hover:text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={onLogout}
                  className="bg-primary-800 hover:bg-primary-900 text-primary-100 hover:text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                >
                  Logout
                </button>
                <div className="flex items-center gap-2 text-sm">
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
                </div>
                <div className="text-primary-200 text-xs dark:text-slate-300">
                  {`${participants.length} user${
                    participants.length !== 1 ? "s" : ""
                  } + ${aiParticipantCount} AI${
                    aiParticipantCount !== 1 ? "s" : ""
                  }`}
                </div>
              </div>
            </div>
          </div>

          <div
            className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-7 bg-gradient-to-b from-slate-50/30 to-white/40 dark:from-slate-900/50 dark:to-slate-900/20"
            ref={messagesContainerRef}
          >
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                aiParticipants={aiParticipantList}
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

            <MessageInput
              onSendMessage={onSendMessage}
              onAIMention={onAIMention}
              onTypingStart={onTypingStart}
              onTypingStop={onTypingStop}
              disabled={!connectionStatus.connected}
            />
          </div>
        </div>

        <ParticipantsList
          participants={participants}
          aiParticipants={aiParticipantList}
          typingUsers={typingUsers}
          typingAIs={typingAIs}
          isVisible={true}
        />
      </div>
    </div>
  );
};

export default ChatView;
