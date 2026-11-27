/**
 * AIMentionList Component - Search results list for the AI mention dialog
 * (header with result count, ranked results, keyboard hint footer).
 * A row click inserts the mention; the row's info button opens the detail card.
 */

import { motion } from "framer-motion";
import Icon from "./Icon";
import { SLIDE_VARIANTS } from "@/config/dialogAnimations";
import { useHueFor } from "@/context/VoiceContext";
import { getModelVoiceKey, voiceStyle } from "@/utils/voice";
import type { MentionOption } from "@/utils/aiSearch";

const KBD_CLASSES =
  "rounded border border-line bg-surface px-1 font-sans text-[10px] leading-4 text-muted";
const INFO_BUTTON_CLASSES =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-faint transition-colors hover:bg-raised hover:text-fg";

interface AIMentionListProps {
  filteredAIs: MentionOption[];
  normalizedTerm: string;
  searchTerm: string;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (item: MentionOption) => void;
  onOpenDetail: (item: MentionOption) => void;
}

const AIMentionList = ({
  filteredAIs,
  normalizedTerm,
  searchTerm,
  activeIndex,
  onActiveIndexChange,
  onSelect,
  onOpenDetail,
}: AIMentionListProps) => {
  const hueFor = useHueFor();

  return (
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
            {filteredAIs.length}{" "}
            {filteredAIs.length === 1 ? "match" : "matches"}
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
            // A div, not a button: the row holds the info button, and
            // buttons can't nest. Keyboard picks go through the dialog's
            // document listener, since focus stays in the composer.
            <div
              key={ai.id}
              onClick={() => onSelect(ai)}
              onMouseEnter={() => onActiveIndexChange(index)}
              role="option"
              aria-selected={isActive}
              style={voiceStyle(hueFor(getModelVoiceKey(ai)))}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
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
                  {ai.description ?? `${ai.displayName}, ${ai.provider}`}
                </span>
              </span>
              <button
                type="button"
                aria-label={`About @${ai.name}`}
                title="Model info"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenDetail(ai);
                }}
                className={INFO_BUTTON_CLASSES}
              >
                <Icon name="info" className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-[11px] text-faint">
        <span className="flex items-center gap-1">
          <kbd className={KBD_CLASSES}>↑</kbd>
          <kbd className={KBD_CLASSES}>↓</kbd> move
        </span>
        <span className="flex items-center gap-1">
          <kbd className={KBD_CLASSES}>Enter</kbd> mention
        </span>
        <span className="flex items-center gap-1">
          <kbd className={KBD_CLASSES}>→</kbd> info
        </span>
        <span className="flex items-center gap-1">
          <kbd className={KBD_CLASSES}>Esc</kbd> close
        </span>
      </div>
    </motion.div>
  );
};

export default AIMentionList;
