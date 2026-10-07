/**
 * AIDetailPreview Component - Preview card for a selected AI in the
 * mention dialog, with back navigation and confirm action.
 */

import { motion } from "framer-motion";
import Icon from "./Icon";
import { SLIDE_VARIANTS } from "@/config/dialogAnimations";
import { voiceStyleFor } from "@/utils/voice";
import type { MentionOption } from "@/utils/aiSearch";

interface AIDetailPreviewProps {
  item: MentionOption;
  onBack: () => void;
  onConfirm: () => void;
}

const AIDetailPreview = ({ item, onBack, onConfirm }: AIDetailPreviewProps) => (
  <motion.div
    key="detail"
    initial={SLIDE_VARIANTS.detail.enter}
    animate={SLIDE_VARIANTS.detail.center}
    exit={SLIDE_VARIANTS.detail.exit}
    transition={{ duration: 0.18, ease: "easeOut" }}
    className="p-4"
    style={voiceStyleFor(item.provider)}
  >
    <button
      type="button"
      onClick={onBack}
      className="mb-4 flex items-center gap-1 text-xs text-muted transition-colors hover:text-fg"
    >
      <Icon name="chevron-right" className="h-3 w-3 rotate-180" />
      Back to results
    </button>

    <div className="flex items-center gap-3">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-voice-soft text-2xl">
        {item.emoji}
      </span>
      <div className="min-w-0">
        <p className="truncate font-display text-base font-bold text-fg">
          {item.displayName}
        </p>
        <p className="truncate text-sm text-muted">
          <span className="text-voice">@{item.name}</span> from {item.provider}
        </p>
      </div>
    </div>

    <button
      type="button"
      onClick={onConfirm}
      className="mt-5 w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-opacity hover:opacity-90"
    >
      Mention @{item.name}
    </button>

    <p className="mt-2.5 text-center text-[11px] text-faint">
      Enter to mention, Esc to go back
    </p>
  </motion.div>
);

export default AIDetailPreview;
