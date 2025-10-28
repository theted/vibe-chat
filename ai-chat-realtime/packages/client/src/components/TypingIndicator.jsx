/**
 * TypingIndicator Component - Shows when someone is typing
 */

import React from 'react';

const TypingIndicator = ({ typingUsers = [], typingAIs = [] }) => {
  const allTyping = [...typingUsers, ...typingAIs];
  
  if (allTyping.length === 0) return null;

  const getDisplayName = (participant) =>
    participant.displayName || participant.name || 'Participant';

  const formatParticipant = (participant) => {
    const fallbackEmoji = participant.type === 'ai' ? '🤖' : '🧑';
    const emoji = participant.emoji || fallbackEmoji;
    return `${emoji} ${getDisplayName(participant)}`;
  };

  const formatTypingText = () => {
    if (allTyping.length === 1) {
      return `${formatParticipant(allTyping[0])} is typing...`;
    }
    if (allTyping.length === 2) {
      return `${formatParticipant(allTyping[0])} and ${formatParticipant(allTyping[1])} are typing up a storm... ✨`;
    }
    return `${allTyping.length} chatters are typing... 🔥`;
  };

  return (
    <div className="flex items-center gap-4 px-8 py-5 bg-slate-50/60 backdrop-blur-md border-t border-slate-100/50 shadow-sm dark:bg-slate-900/70 dark:border-slate-800/50 dark:shadow-none">
      <div className="flex items-center gap-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce-delay-0 shadow-sm dark:bg-primary-300"></div>
          <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce-delay-1 shadow-sm dark:bg-primary-300"></div>
          <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce-delay-2 shadow-sm dark:bg-primary-300"></div>
        </div>
        <span className="text-sm text-slate-600 font-medium animate-pulse dark:text-slate-300">
          {formatTypingText()}
        </span>
      </div>
      <div className="flex -space-x-2 ml-auto">
        {allTyping.slice(0, 3).map((user, index) => (
          <div
            key={`${user.type}-${user.id || user.name || index}`}
            className={`w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-semibold animate-pulse dark:border-slate-900 ${
              user.type === 'ai'
                ? 'bg-gradient-to-br from-purple-400 to-purple-600 text-white dark:from-purple-500 dark:to-purple-700'
                : 'bg-gradient-to-br from-blue-400 to-blue-600 text-white dark:from-blue-400 dark:to-blue-700'
            }`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {user.type === 'ai'
              ? user.emoji || '🤖'
              : getDisplayName(user).charAt(0).toUpperCase()}
          </div>
        ))}
        {allTyping.length > 3 && (
          <div className="w-6 h-6 bg-slate-400 rounded-full border-2 border-white flex items-center justify-center text-xs font-semibold text-white dark:bg-slate-700 dark:border-slate-900 dark:text-slate-100">
            +{allTyping.length - 3}
          </div>
        )}
      </div>
    </div>
  );
};

export default TypingIndicator;
