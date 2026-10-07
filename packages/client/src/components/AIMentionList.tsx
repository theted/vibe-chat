/**
 * AIMentionList Component - Search results list for the AI mention dialog
 * (header with result count, ranked results, keyboard hint footer).
 */

import { motion } from "framer-motion";
import { SLIDE_VARIANTS } from "@/config/dialogAnimations";
import { voiceStyleFor } from "@/utils/voice";
import type { MentionOption } from "@/utils/aiSearch";

const KBD_CLASSES =
  "rounded border border-line bg-surface px-1 font-sans text-[10px] leading-4 text-muted";

interface AIMentionListProps {
  filteredAIs: MentionOption[];
  normalizedTerm: string;
  searchTerm: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onOpenDetail: (item: MentionOption) => void;
}

const AIMentionList = ({
  filteredAIs,
  normalizedTerm,
  searchTerm,
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
    <div className="flex items-baseline justify-between px-4 pb-1.5 pt-3">
      <span className="font-display text-sm font-semibold">
        Mention a model
      </span>
      {normalizedTerm && (
        <span className="text-xs tabular-nums text-faint">
          {filteredAIs.length} {filteredAIs.length === 1 ? "match" : "matches"}
        </span>
      )}
    </div>

    <div
      className="thin-scrollbar max-h-72 overflow-y-auto px-1.5 pb-1.5"
      role="listbox"
    >
      {filteredAIs.length === 0 && (
        <p className="px-3 py-4 text-center text-sm text-muted">
          No model matches &ldquo;{searchTerm}&rdquo;
        </p>
      )}

      {filteredAIs.map((ai, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            key={ai.id}
            type="button"
            onClick={() => onOpenDetail(ai)}
            onMouseEnter={() => onActiveIndexChange(index)}
            role="option"
            aria-selected={isActive}
            style={voiceStyleFor(ai.provider)}
            className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
              isActive ? "bg-surface" : ""
            }`}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-voice-soft text-base">
              {ai.emoji}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block truncate text-sm font-medium ${isActive ? "text-voice" : "text-fg"}`}
              >
                @{ai.name}
              </span>
              <span className="block truncate text-xs text-faint">
                {ai.displayName}, {ai.provider}
              </span>
            </span>
          </button>
        );
      })}
    </div>

    <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-[11px] text-faint">
      <span className="flex items-center gap-1">
        <kbd className={KBD_CLASSES}>↑</kbd>
        <kbd className={KBD_CLASSES}>↓</kbd> move
      </span>
      <span className="flex items-center gap-1">
        <kbd className={KBD_CLASSES}>Enter</kbd> preview
      </span>
      <span className="flex items-center gap-1">
        <kbd className={KBD_CLASSES}>Esc</kbd> close
      </span>
    </div>
  </motion.div>
);

export default AIMentionList;
