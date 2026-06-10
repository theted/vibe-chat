/**
 * AIMentionList Component - Search results list for the AI mention dialog
 * (header with loading state, ranked results, keyboard hint footer).
 */

import { motion, AnimatePresence } from "framer-motion";
import Icon from "./Icon";
import Spinner from "./Spinner";
import { SLIDE_VARIANTS } from "@/config/dialogAnimations";
import type { MentionOption } from "@/utils/aiSearch";

interface AIMentionListProps {
  filteredAIs: MentionOption[];
  normalizedTerm: string;
  searchTerm: string;
  isLoading: boolean;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onOpenDetail: (item: MentionOption) => void;
}

const AIMentionList = ({
  filteredAIs,
  normalizedTerm,
  searchTerm,
  isLoading,
  activeIndex,
  onActiveIndexChange,
  onOpenDetail,
}: AIMentionListProps) => (
  <motion.div
    key="list"
    initial={SLIDE_VARIANTS.list.enter}
    animate={SLIDE_VARIANTS.list.center}
    exit={SLIDE_VARIANTS.list.exit}
    transition={{ duration: 0.15, ease: "easeOut" }}
  >
    {/* Header */}
    <div className="flex items-center gap-2 px-4 pt-4 pb-2 border-b border-slate-100/60 dark:border-slate-800/60">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.span
            key="spinner"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
          >
            <Spinner />
          </motion.span>
        ) : (
          <motion.span
            key="icon"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
          >
            <Icon name="sparkle" className="w-3.5 h-3.5 text-primary-400" />
          </motion.span>
        )}
      </AnimatePresence>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {isLoading
          ? "Searching…"
          : normalizedTerm
          ? `${filteredAIs.length} result${filteredAIs.length !== 1 ? "s" : ""}`
          : "Mention an AI"}
      </span>
    </div>

    {/* Results */}
    <div className="px-2 py-2 max-h-72 overflow-y-auto no-scrollbar" role="listbox">
      <AnimatePresence>
        {!isLoading && filteredAIs.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-slate-400 px-2 py-4 text-center dark:text-slate-500"
          >
            No AIs match &ldquo;{searchTerm}&rdquo;
          </motion.div>
        )}
      </AnimatePresence>

      {!isLoading &&
        filteredAIs.map((ai, index) => {
          const isActive = index === activeIndex;
          return (
            <motion.button
              // Key includes search term so items re-animate on each new search
              key={`${ai.id}__${normalizedTerm}`}
              initial={{ opacity: 0, x: -8, y: 3 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.18, ease: "easeOut" }}
              onClick={() => onOpenDetail(ai)}
              onMouseEnter={() => onActiveIndexChange(index)}
              role="option"
              aria-selected={isActive}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-colors text-left group ${
                isActive
                  ? "bg-primary-50 dark:bg-primary-500/10 ring-1 ring-primary-200/80 dark:ring-primary-500/30"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
              }`}
            >
              <span className="text-xl leading-none transform group-hover:scale-110 transition-transform duration-150 shrink-0">
                {ai.emoji}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 font-medium text-sm text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">
                  @{ai.name}
                  <Icon
                    name="chevron-right"
                    className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity"
                  />
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 truncate">
                  {ai.displayName} · {ai.provider}
                </div>
              </div>
              {isActive && (
                <span className="shrink-0 text-xs text-slate-400 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md">
                  ↵
                </span>
              )}
            </motion.button>
          );
        })}
    </div>

    {/* Footer */}
    <div className="px-4 py-2.5 border-t border-slate-100/60 dark:border-slate-800/60 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
      <span>↑↓ navigate</span>
      <span>·</span>
      <span>↵ preview</span>
      <span>·</span>
      <span className="flex items-center gap-1">
        <Icon name="x-mark" className="w-3 h-3" /> Esc
      </span>
    </div>
  </motion.div>
);

export default AIMentionList;
