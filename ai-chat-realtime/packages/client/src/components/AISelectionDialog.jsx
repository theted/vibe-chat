/**
 * AISelectionDialog Component - Modal for selecting AI to mention
 */

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './Icon.jsx';

const AISelectionDialog = ({ isOpen, onClose, onSelect, searchTerm = '', position }) => {
  const dialogRef = useRef(null);

  // Default AI participants (optimized for @mentions)
  const aiParticipants = [
    { name: 'claude', displayName: 'Claude', provider: 'Anthropic', emoji: '🤖', keywords: ['claude', 'anthropic'] },
    { name: 'gpt-4', displayName: 'GPT-4', provider: 'OpenAI', emoji: '🧠', keywords: ['gpt', 'gpt4', 'openai', 'chatgpt'] },
    { name: 'grok', displayName: 'Grok', provider: 'xAI', emoji: '🦾', keywords: ['grok', 'xai'] },
    { name: 'gemini', displayName: 'Gemini', provider: 'Google', emoji: '💎', keywords: ['gemini', 'google', 'bard'] },
    { name: 'cohere', displayName: 'Command R', provider: 'Cohere', emoji: '🔮', keywords: ['command', 'cohere', 'commandr'] },
    { name: 'mistral', displayName: 'Mistral', provider: 'Mistral AI', emoji: '🌟', keywords: ['mistral'] },
    { name: 'kimi', displayName: 'Kimi', provider: 'Moonshot AI', emoji: '🎯', keywords: ['kimi', 'moonshot'] },
    { name: 'z.ai', displayName: 'Z.ai', provider: 'Z.ai', emoji: '⚡', keywords: ['z.ai', 'z', 'zai'] }
  ];

  // Filter AIs based on search term
  const filteredAIs = aiParticipants.filter(ai => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return ai.name.toLowerCase().includes(term) || 
           ai.displayName.toLowerCase().includes(term) ||
           ai.provider.toLowerCase().includes(term) ||
           ai.keywords.some(keyword => keyword.includes(term));
  });

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && filteredAIs.length > 0) {
        onSelect(filteredAIs[0].name);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onSelect, filteredAIs]);

  // Handle clicks outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
      ref={dialogRef}
      className="fixed z-[9999] bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-80 dark:bg-slate-900/95 dark:border-slate-700 dark:text-slate-100"
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -5, scale: 0.98 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.2
      }}
      style={{
        left: position.x,
        top: position.y - 10,
        transform: 'translateY(-100%)'
      }}
    >
      <motion.div 
        className="p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.2 }}
      >
        <div className="text-xs text-slate-500 mb-3 px-2 flex items-center gap-2 dark:text-slate-300">
          <Icon name="info" className="w-4 h-4" />
          Select an AI to mention:
        </div>
        
        {filteredAIs.length === 0 ? (
          <div className="text-sm text-slate-400 px-2 py-3 text-center dark:text-slate-400">
            No AIs found matching "{searchTerm}"
          </div>
        ) : (
          <div className="space-y-1 max-h-64 overflow-y-auto no-scrollbar">
            {filteredAIs.map((ai, index) => (
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, duration: 0.3 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                key={ai.name}
                onClick={() => onSelect(ai.name)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left group hover:bg-slate-50 dark:hover:bg-slate-800/70"
              >
                <div className="text-xl transform group-hover:scale-110 transition-transform duration-200">{ai.emoji}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-700 group-hover:text-slate-900 flex items-center gap-1 dark:text-slate-200 dark:group-hover:text-white">
                    <span>@{ai.name}</span>
                    <Icon
                      name="chevron-right"
                      className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    />
                  </div>
                  <div className="text-xs text-slate-500 truncate dark:text-slate-400">
                    {ai.displayName} • {ai.provider}
                  </div>
                </div>
                {index === 0 && (
                  <div className="text-xs text-slate-400 px-2 py-1 bg-slate-100 rounded-md dark:bg-slate-800/60 dark:text-slate-300">
                    Enter
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        )}
        
        <div className="text-xs text-slate-400 mt-3 px-2 border-t border-slate-100/50 pt-3 flex items-center gap-2 dark:text-slate-400 dark:border-slate-800/60">
          <Icon name="x-mark" className="w-3 h-3" />
          Press Esc to cancel
        </div>
      </motion.div>
    </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AISelectionDialog;
