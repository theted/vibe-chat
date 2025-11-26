/**
 * AISelectionDialog Component - Modal for selecting AI to mention
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './Icon.jsx';
import { DEFAULT_AI_PARTICIPANTS } from './ParticipantsList.jsx';

const normalize = (value) => value?.toLowerCase?.().replace(/[^a-z0-9]/g, '') || '';

const fuzzyMatch = (term, candidate) => {
  if (!term) return true;
  let termIndex = 0;
  const normalizedTerm = term.toLowerCase();
  const normalizedCandidate = candidate.toLowerCase();
  for (let i = 0; i < normalizedCandidate.length && termIndex < normalizedTerm.length; i++) {
    if (normalizedCandidate[i] === normalizedTerm[termIndex]) {
      termIndex += 1;
    }
  }
  return termIndex === normalizedTerm.length;
};

const computeScore = (term, option) => {
  if (!term) return 0;
  const alias = option.name.toLowerCase();
  const display = option.displayName.toLowerCase();
  const provider = option.provider.toLowerCase();

  if (alias.startsWith(term)) return 0;
  if (display.startsWith(term)) return 0.5;
  if (alias.includes(term)) return 1;
  if (display.includes(term)) return 1.5;
  if (provider.includes(term)) return 2;
  if (option.keywords.some((keyword) => keyword.includes(term))) return 2.5;
  if (option.keywords.some((keyword) => fuzzyMatch(term, keyword))) return 3;
  return Number.POSITIVE_INFINITY;
};

const AISelectionDialog = ({ isOpen, onClose, onSelect, searchTerm = '', position }) => {
  const dialogRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const mentionOptions = useMemo(() => {
    const extras = [
      { id: 'OPENAI_GPT4', name: 'gpt-4', alias: 'gpt-4', provider: 'OpenAI', emoji: '🧠' },
      { id: 'OPENAI_CHATGPT', name: 'chatgpt', alias: 'chatgpt', provider: 'OpenAI', emoji: '💬' },
    ];

    const combined = [...DEFAULT_AI_PARTICIPANTS, ...extras];

    return combined.map((ai) => {
      const alias = ai.alias || ai.name || ai.displayName;
      const displayName = ai.displayName || ai.name || alias || ai.id;
      const normalizedAlias = normalize(alias);
      const normalizedName = normalize(ai.name || displayName);
      const normalizedProvider = normalize(ai.provider || '');
      const keywords = [alias, ai.name, ai.provider, ai.id, displayName]
        .filter(Boolean)
        .map((value) => normalize(value))
        .filter(Boolean);

      return {
        id: ai.id,
        name: alias,
        displayName,
        provider: ai.provider || 'AI',
        emoji: ai.emoji || '🤖',
        keywords: Array.from(new Set([normalizedAlias, normalizedName, normalizedProvider, ...keywords])).filter(Boolean),
      };
    });
  }, []);

  const normalizedTerm = searchTerm?.trim().toLowerCase() || '';

  const filteredAIs = useMemo(() => {
    return mentionOptions
      .map((option) => ({
        ...option,
        score: computeScore(normalizedTerm, option)
      }))
      .filter((option) => normalizedTerm ? option.score < Number.POSITIVE_INFINITY : true)
      .sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.displayName.localeCompare(b.displayName);
      });
  }, [mentionOptions, normalizedTerm]);

  // Reset active index when dialog opens or results change
  useEffect(() => {
    if (isOpen) {
      setActiveIndex(0);
    }
  }, [isOpen, filteredAIs.length]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown' && filteredAIs.length > 0) {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filteredAIs.length);
      } else if (e.key === 'ArrowUp' && filteredAIs.length > 0) {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + filteredAIs.length) % filteredAIs.length);
      } else if (e.key === 'Enter' && filteredAIs.length > 0) {
        e.preventDefault();
        const selectedAI = filteredAIs[activeIndex] || filteredAIs[0];
        if (selectedAI) {
          onSelect(selectedAI.name);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, filteredAIs, isOpen, onClose, onSelect]);

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

  const safePosition = useMemo(() => {
    if (position && typeof position.x === 'number' && typeof position.y === 'number') {
      return position;
    }
    if (typeof window !== 'undefined') {
      return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    }
    return { x: 0, y: 0 };
  }, [position]);

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
            duration: 0.2,
          }}
          style={{
            left: safePosition.x,
            top: safePosition.y - 10,
            transform: 'translateY(-100%)',
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
              <div className="space-y-1 max-h-64 overflow-y-auto no-scrollbar" role="listbox">
                {filteredAIs.map((ai, index) => {
                  const isActive = index === activeIndex;

                  return (
                    <motion.button
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      key={ai.name}
                      onClick={() => onSelect(ai.name)}
                      onMouseEnter={() => setActiveIndex(index)}
                      role="option"
                      aria-selected={isActive}
                      data-active={isActive ? 'true' : 'false'}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left group hover:bg-slate-50 dark:hover:bg-slate-800/70 ${
                        isActive
                          ? 'bg-slate-100 dark:bg-slate-800/70 ring-2 ring-primary-200 dark:ring-primary-500/40'
                          : ''
                      }`}
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
                      {index === activeIndex && (
                        <div className="text-xs text-slate-400 px-2 py-1 bg-slate-100 rounded-md dark:bg-slate-800/60 dark:text-slate-300">
                          Enter
                        </div>
                      )}
                    </motion.button>
                  );
                })}
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
