/**
 * AIDetailPreview Component - Preview card for a selected AI in the
 * mention dialog, with back navigation and confirm action.
 */

import { motion } from "framer-motion";
import Icon from "./Icon";
import { SLIDE_VARIANTS } from "@/config/dialogAnimations";
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
  >
    {/* Back */}
    <button
      type="button"
      onClick={onBack}
      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mb-4 transition-colors group"
    >
      <Icon name="chevron-right" className="w-3 h-3 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
      Back to results
    </button>

    {/* AI card */}
    <div className="flex flex-col items-center text-center gap-3 py-2">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.05, type: "spring", stiffness: 260, damping: 20 }}
        className="text-5xl leading-none"
      >
        {item.emoji}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.18 }}
      >
        <p className="font-semibold text-slate-800 dark:text-slate-100 text-base leading-tight">
          {item.displayName}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          @{item.name}
        </p>
      </motion.div>
      <motion.span
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.14 }}
        className="inline-flex items-center rounded-full bg-primary-50 border border-primary-200/70 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-500/10 dark:border-primary-500/40 dark:text-primary-200"
      >
        {item.provider}
      </motion.span>
    </div>

    {/* Confirm button */}
    <motion.button
      type="button"
      onClick={onConfirm}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18, duration: 0.18 }}
      className="glass-btn mt-5 w-full flex items-center justify-center gap-2 rounded-xl bg-primary-500/90 hover:bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary-500/30 transition-colors"
    >
      <Icon name="send" className="w-3.5 h-3.5" />
      Mention @{item.name}
    </motion.button>

    <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-3">
      Enter to confirm · Esc to go back
    </p>
  </motion.div>
);

export default AIDetailPreview;
