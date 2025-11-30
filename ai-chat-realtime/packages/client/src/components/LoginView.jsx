import React from "react";

import { DEFAULT_AI_PARTICIPANTS } from "../../../../constants.js";
import ParticipantsList from "./ParticipantsList.jsx";
import Icon from "./Icon.jsx";
import ChatMessage from "./ChatMessage.jsx";

import CircuitIcon from "./CircuitIcon.jsx";

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
  <div className="relative min-h-screen overflow-hidden text-slate-100">
    <div className="absolute inset-0">
      <div className="absolute -top-1/4 -left-1/4 h-[120%] w-[120%] bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.15),_transparent_60%)]" />
      <div className="absolute bottom-0 right-0 h-[70%] w-[70%] bg-[radial-gradient(circle_at_bottom,_rgba(167,139,250,0.2),_transparent_65%)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 opacity-70" />
    </div>

    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="absolute top-8 right-8 flex items-center gap-4 text-sm text-slate-300/80">
        {/*<div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 backdrop-blur">
          <span
            className={`h-2.5 w-2.5 rounded-full transition-colors ${
              connectionStatus.connected
                ? "bg-emerald-400"
                : "bg-rose-400 animate-pulse"
            }`}
          ></span>
          <span className="tracking-[0.2em] uppercase text-xs font-light">
            {connectionStatus.connected ? "Connected" : "Connecting..."}
          </span>s
        </div>*/}
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium tracking-[0.2em] uppercase text-slate-100/80 transition-all hover:bg-white/10"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} className="h-4 w-4" />
          <span className="hidden sm:inline">
            {theme === "dark" ? "Light" : "Dark"} Mode
          </span>
        </button>
      </div>

      <div className="flex w-full max-w-5xl flex-col items-center gap-16 rounded-[3rem] border border-white/10 bg-white/5 p-10 text-center backdrop-blur-xl shadow-2xl shadow-black/40 animate-fade-in-slow lg:flex-row lg:items-end lg:text-left">
        <div className="flex justify-center lg:justify-start">
          <CircuitIcon className="h-64 w-64 text-slate-100/90 drop-shadow-[0_20px_60px_rgba(15,23,42,0.7)]" />
        </div>

        <div className="flex flex-1 flex-col items-center gap-10 lg:items-start">
          <div className="space-y-6">
            <h1 className="text-4xl font-extralight tracking-[0.6em] text-white drop-shadow-sm sm:text-5xl lg:text-6xl uppercase">
              Vibe Chat
            </h1>
            <p className="max-w-xl text-base font-light leading-relaxed text-slate-200/80 sm:text-lg">
              Group chat with AI's.
            </p>
          </div>

          {error && (
            <div className="w-full max-w-lg rounded-2xl border border-rose-400/30 bg-rose-500/10 px-6 py-4 text-sm text-rose-100 shadow-lg shadow-rose-900/30 animate-fade-in-slow">
              {error}
            </div>
          )}

          <form
            onSubmit={onJoin}
            className="flex w-full max-w-lg flex-col gap-4"
          >
            {/*<label className="text-xs uppercase tracking-[0.4em] text-slate-200/70">
              Username
            </label>*/}
            <input
              type="text"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              placeholder="Enter your username (will be saved)"
              maxLength={50}
              pattern="[a-zA-Z0-9_-]+"
              title="Username can only contain letters, numbers, dash, and underscore"
              className="w-full rounded-full border border-white/20 bg-white/5 px-6 py-3 text-base font-light text-slate-100 placeholder:text-slate-400/60 outline-none transition-all focus:border-primary-300 focus:ring-2 focus:ring-primary-400/40"
              required
            />
            <button
              type="submit"
              disabled={!connectionStatus.connected || !username.trim()}
              className="group relative flex w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-r from-slate-100 to-slate-300 px-8 py-3 text-base font-semibold uppercase tracking-[0.4em] text-slate-900 transition-all duration-300 disabled:from-slate-500 disabled:to-slate-600 disabled:text-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
            >
              <span className="absolute inset-0 translate-y-full bg-gradient-to-r from-primary-500/80 via-indigo-500/80 to-sky-500/80 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100" />
              <span className="relative">Join Chat</span>
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
