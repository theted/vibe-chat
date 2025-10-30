import React from "react";
import ParticipantsList, { DEFAULT_AI_PARTICIPANTS } from "./ParticipantsList.jsx";
import Icon from "./Icon.jsx";
import ChatMessage from "./ChatMessage.jsx";

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
}) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
    <div className="flex bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[900px] overflow-hidden animate-scale-in border border-white/20 dark:bg-slate-900/90 dark:border-slate-800">
      <div className="flex-1 flex flex-col">
        <div className="bg-gradient-to-r from-slate-600/90 to-slate-700/90 backdrop-blur-sm text-white p-6 rounded-tl-3xl border-b border-white/10 dark:from-slate-800/90 dark:to-slate-900/90 dark:border-slate-800/60">
          <div className="flex justify-between items-stretch gap-6 flex-wrap">
            <div className="flex flex-col justify-center">
              <h1 className="header-title header-title--hero">AI Chat Realtime</h1>
              <div className="text-slate-300/90 text-xs uppercase tracking-[0.32em] mt-3">
                Enter your username to join the conversation
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm self-stretch flex-wrap justify-end">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full transition-colors ${
                    connectionStatus.connected
                      ? "bg-green-400"
                      : "bg-red-400 animate-pulse"
                  }`}
                ></div>
                <span>
                  {connectionStatus.connected ? "Connected" : "Connecting..."}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium transition-colors dark:border-slate-700 dark:bg-slate-900/50 dark:hover:bg-slate-900/70 dark:text-slate-200"
                  title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                >
                  <Icon name={theme === "dark" ? "sun" : "moon"} className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {theme === "dark" ? "Light mode" : "Dark mode"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center items-center p-8 space-y-8">
          <div className="text-center space-y-4 animate-fade-in">
            <div className="text-4xl mb-4">🤖✨</div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
              Welcome to AI Chat Realtime!
            </h2>
            <div className="text-slate-600 space-y-2 max-w-lg dark:text-slate-300">
              <p>
                Join the conversation with AI personalities from different
                providers.
              </p>
              <p>
                Each AI has its own unique personality and communication
                style.
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50/70 backdrop-blur-sm border border-red-200/50 text-red-800 px-6 py-4 rounded-2xl text-center animate-slide-up shadow-sm dark:bg-red-500/10 dark:border-red-400/40 dark:text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={onJoin} className="w-full max-w-sm space-y-4 animate-slide-up">
            <input
              type="text"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              placeholder="Enter your username (will be saved)"
              maxLength={50}
              pattern="[a-zA-Z0-9_-]+"
              title="Username can only contain letters, numbers, dash, and underscore"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all placeholder-slate-400 dark:bg-slate-900/80 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500"
              required
            />
            <button
              type="submit"
              disabled={!connectionStatus.connected || !username.trim()}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-6 rounded-xl font-semibold hover:from-primary-700 hover:to-primary-800 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl dark:disabled:from-slate-700 dark:disabled:to-slate-800"
            >
              Join Chat
            </button>
          </form>

          {previewMessages.length > 0 && (
            <div className="w-full max-w-2xl mt-8 animate-fade-in">
              <div className="flex items-center gap-2 mb-3 text-slate-500 uppercase text-xs tracking-[0.28em] dark:text-slate-300">
                <Icon name="chat" className="w-4 h-4" />
                Recent Conversation
              </div>
              <div className="max-h-72 overflow-y-auto no-scrollbar space-y-4 bg-white/60 border border-slate-200/60 rounded-2xl p-4 shadow-inner dark:bg-slate-900/60 dark:border-slate-800/60">
                {previewMessages.map((message) => (
                  <ChatMessage
                    key={message.id || `${message.timestamp}-${message.sender}`}
                    message={message}
                    aiParticipants={
                      previewAiParticipants.length > 0
                        ? previewAiParticipants
                        : DEFAULT_AI_PARTICIPANTS
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ParticipantsList
        participants={previewParticipants}
        aiParticipants={
          previewAiParticipants.length > 0
            ? previewAiParticipants
            : DEFAULT_AI_PARTICIPANTS
        }
        typingUsers={[]}
        typingAIs={[]}
        isVisible={true}
      />
    </div>
  </div>
);

export default LoginView;
