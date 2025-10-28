/**
 * ParticipantsList Component - Shows connected users and AI participants
 */

import React from 'react';
import { motion } from 'framer-motion';
import Icon from './Icon.jsx';

const ParticipantsList = ({ participants = [], aiParticipants = [], typingUsers = [], typingAIs = [], isVisible = true }) => {
  if (!isVisible) return null;

  const normalize = (value) =>
    value ? value.toString().toLowerCase().replace(/[^a-z0-9]/g, '') : '';

  // Default AI participants based on the available providers
  const defaultAIParticipants = [
    { id: 'ANTHROPIC_CLAUDE3_7_SONNET', name: 'Claude 3.7 Sonnet', alias: 'claude', provider: 'Anthropic', status: 'active', emoji: '🤖' },
    { id: 'ANTHROPIC_CLAUDE_SONNET_4', name: 'Claude Sonnet 4', alias: 'claude', provider: 'Anthropic', status: 'active', emoji: '🤖' },
    { id: 'OPENAI_GPT4O', name: 'GPT-4o', alias: 'gpt-4o', provider: 'OpenAI', status: 'active', emoji: '🧠' },
    { id: 'OPENAI_GPT35_TURBO', name: 'GPT-3.5 Turbo', alias: 'gpt-3-5', provider: 'OpenAI', status: 'active', emoji: '💡' },
    { id: 'GROK_GROK_3', name: 'Grok 3', alias: 'grok', provider: 'xAI', status: 'active', emoji: '🦾' },
    { id: 'GEMINI_GEMINI_PRO', name: 'Gemini Pro', alias: 'gemini', provider: 'Google', status: 'active', emoji: '💎' },
    { id: 'COHERE_COMMAND_A_03_2025', name: 'Command A', alias: 'cohere', provider: 'Cohere', status: 'active', emoji: '🔮' },
    { id: 'MISTRAL_MISTRAL_LARGE', name: 'Mistral Large', alias: 'mistral', provider: 'Mistral AI', status: 'active', emoji: '🌟' },
    { id: 'DEEPSEEK_DEEPSEEK_CHAT', name: 'DeepSeek Chat', alias: 'deepseek', provider: 'DeepSeek', status: 'active', emoji: '🔍' },
    { id: 'KIMI_KIMI_8K', name: 'Kimi', alias: 'kimi', provider: 'Moonshot AI', status: 'active', emoji: '🎯' },
    { id: 'ZAI_ZAI_DEFAULT', name: 'Z.ai', alias: 'z.ai', provider: 'Z.ai', status: 'active', emoji: '⚡' }
  ].map(ai => ({
    ...ai,
    displayName: ai.displayName || ai.name,
    normalizedAlias: normalize(ai.alias || ai.name)
  }));

  const baseAIList = aiParticipants.length > 0 ? aiParticipants : defaultAIParticipants;
  const aiList = baseAIList.map((ai) => {
    const alias = ai.alias || ai.name || ai.displayName;
    return {
      ...ai,
      displayName: ai.displayName || ai.name,
      alias,
      normalizedAlias: normalize(ai.normalizedAlias || alias),
      status: ai.status || 'active'
    };
  });

  const isUserTyping = (username) => {
    const normalizedUsername = username?.toLowerCase();
    return typingUsers.some(user => user.normalized === normalizedUsername || user.name === username);
  };

  const isAITyping = (aiEntry) => {
    const normalizedTarget = normalize(aiEntry.alias || aiEntry.name || aiEntry.displayName);
    return typingAIs.some(ai => {
      if (ai.id && aiEntry.id && ai.id === aiEntry.id) return true;
      if (ai.normalizedAlias && normalizedTarget && ai.normalizedAlias === normalizedTarget) return true;
      if (ai.alias && normalizedTarget && normalize(ai.alias) === normalizedTarget) return true;
      return false;
    });
  };

  return (
    <div className="w-80 bg-gradient-to-b from-slate-50/50 to-white/70 backdrop-blur-sm border-l border-slate-200/50 flex flex-col rounded-tr-3xl rounded-br-3xl lg:flex hidden dark:from-slate-950/40 dark:to-slate-950/20 dark:border-slate-800/60">
      <div className="bg-gradient-to-r from-slate-600/90 to-slate-700/90 backdrop-blur-sm text-white p-4 rounded-tr-3xl border-b border-white/10 dark:from-slate-800/90 dark:to-slate-900/90 dark:border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center dark:bg-slate-900/60">
            <Icon name="participants" className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-lg text-white/95">Participants ({participants.length + aiList.length})</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Users */}
        {participants.length > 0 && (
          <div className="border-b border-slate-100 dark:border-slate-800/60">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 bg-slate-50/70 backdrop-blur-sm flex items-center gap-2 dark:text-slate-300 dark:bg-slate-900/60">
              <Icon name="users" className="w-4 h-4" />
              Users ({participants.length})
            </h4>
            <div className="pb-2">
              {participants.map((participant, index) => {
                const typing = isUserTyping(participant.username);
                return (
                  <motion.div 
                    key={`user-${index}`} 
                    className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-b-0 dark:border-slate-900/40 dark:hover:bg-slate-800/60"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      delay: index * 0.05, 
                      duration: 0.3,
                      ease: "easeOut"
                    }}
                    whileHover={{ 
                      scale: 1.02,
                      transition: { duration: 0.2 }
                    }}
                  >
                    <div className={`w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold ${typing ? 'animate-pulse' : ''}`}>
                      {participant.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-700 flex-1 dark:text-slate-200">{participant.username}</span>
                    {typing ? (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 dark:bg-yellow-500/20 dark:text-yellow-200">
                        <div className="w-1.5 h-1.5 bg-yellow-600 rounded-full animate-bounce dark:bg-yellow-300"></div>
                        typing...
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium dark:bg-green-500/20 dark:text-green-200">
                        online
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI Participants */}
        <div>
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 bg-slate-50/70 backdrop-blur-sm flex items-center gap-2 dark:text-slate-300 dark:bg-slate-900/60">
            <Icon name="monitor" className="w-4 h-4" />
            AI Assistants ({aiList.length})
          </h4>
          <div className="pb-2">
            {aiList.map((ai, index) => {
              const generating = isAITyping(ai);
              return (
                <motion.div 
                  key={`ai-${index}`} 
                  className="flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-colors border-b border-slate-50 last:border-b-0 dark:border-slate-900/40 dark:hover:bg-slate-800/60"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    delay: index * 0.05, 
                    duration: 0.3,
                    ease: "easeOut"
                  }}
                  whileHover={{ 
                    scale: 1.02,
                    transition: { duration: 0.2 }
                  }}
                >
                  <div className={`text-2xl ${generating ? 'animate-pulse' : ''}`}>{ai.emoji || '🤖'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-700 truncate dark:text-slate-200">{ai.displayName || ai.name}</div>
                    <div className="text-xs text-slate-500 truncate dark:text-slate-400">{ai.provider}</div>
                  </div>
                  {generating ? (
                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 dark:bg-purple-500/20 dark:text-purple-200">
                      <div className="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce dark:bg-purple-300"></div>
                      typing...
                    </span>
                  ) : (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      ai.status === 'active' 
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200' 
                        : 'bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-200'
                    }`}>
                      {ai.status}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantsList;
