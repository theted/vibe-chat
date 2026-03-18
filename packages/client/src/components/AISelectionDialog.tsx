/**
 * AISelectionDialog Component - Modal for selecting AI to mention
 * Two-step flow: list → detail → confirm insert.
 * Enter/click on a result opens the detail view; Enter/button from detail inserts.
 * Capture-phase keyboard listener prevents Enter from propagating to the form.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { resolveEmoji } from "@ai-chat/ai-configs";
import { DEFAULT_AI_PARTICIPANTS } from "@/config/aiParticipants";
import Icon from "./Icon";
import type { AISelectionDialogProps, DialogPosition } from "@/types";

const DIALOG_Y_OFFSET = 10;
const SEARCH_LOADING_MS = 160;

const DIALOG_SPRING: import("framer-motion").Transition = {
  type: "spring",
  stiffness: 320,
  damping: 28,
  duration: 0.2,
};

const SLIDE_VARIANTS = {
  list: {
    enter: { opacity: 0, x: -18 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -18 },
  },
  detail: {
    enter: { opacity: 0, x: 18 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 18 },
  },
};

const EXTRA_AI_PARTICIPANTS = [
  {
    id: "OPENAI_GPT4",
    name: "gpt-4",
    alias: "gpt-4",
    provider: "OpenAI",
    emoji: resolveEmoji("gpt-4"),
  },
  {
    id: "OPENAI_CHATGPT",
    name: "chatgpt",
    alias: "chatgpt",
    provider: "OpenAI",
    emoji: resolveEmoji("chatgpt"),
  },
];

interface MentionOption {
  id: string;
  name: string;
  displayName: string;
  provider: string;
  emoji: string;
  keywords: string[];
  score?: number;
}

const normalize = (v: string | undefined | null): string =>
  v?.toLowerCase?.().replace(/[^a-z0-9]/g, "") || "";

const fuzzyMatch = (term: string, candidate: string): boolean => {
  if (!term) return true;
  let ti = 0;
  const t = term.toLowerCase();
  const c = candidate.toLowerCase();
  for (let i = 0; i < c.length && ti < t.length; i++) {
    if (c[i] === t[ti]) ti++;
  }
  return ti === t.length;
};

const computeScore = (term: string, option: MentionOption): number => {
  if (!term) return 0;
  const alias = option.name.toLowerCase();
  const display = option.displayName.toLowerCase();
  const provider = option.provider.toLowerCase();

  if (alias.startsWith(term)) return 0;
  if (display.startsWith(term)) return 0.5;
  if (alias.includes(term)) return 1;
  if (display.includes(term)) return 1.5;
  if (provider.includes(term)) return 2;
  if (option.keywords.some((k) => k.includes(term))) return 2.5;
  if (option.keywords.some((k) => fuzzyMatch(term, k))) return 3;
  return Number.POSITIVE_INFINITY;
};

// ── Spinner ────────────────────────────────────────────────────────────────
const Spinner = () => (
  <svg
    className="animate-spin w-3.5 h-3.5 text-primary-400"
    viewBox="0 0 24 24"
    fill="none"
  >
    <circle
      cx="12" cy="12" r="9"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeDasharray="28 56"
      strokeLinecap="round"
    />
  </svg>
);

// ── Detail view ────────────────────────────────────────────────────────────
const DetailView = ({
  item,
  onBack,
  onConfirm,
}: {
  item: MentionOption;
  onBack: () => void;
  onConfirm: () => void;
}) => (
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

// ── Main component ─────────────────────────────────────────────────────────
const AISelectionDialog = ({
  isOpen,
  onClose,
  onSelect,
  searchTerm = "",
  position,
}: AISelectionDialogProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedItem, setSelectedItem] = useState<MentionOption | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const mentionOptions = useMemo<MentionOption[]>(() => {
    const combined = [...DEFAULT_AI_PARTICIPANTS, ...EXTRA_AI_PARTICIPANTS];
    return combined.map((ai) => {
      const alias = ai.alias || ai.name;
      const displayName = ai.name || alias || ai.id;
      const normalizedAlias = normalize(alias);
      const normalizedName = normalize(ai.name || displayName);
      const normalizedProvider = normalize(ai.provider || "");
      const keywords = [alias, ai.name, ai.provider, ai.id, displayName]
        .filter(Boolean)
        .map((v) => normalize(v))
        .filter(Boolean);

      return {
        id: ai.id,
        name: alias,
        displayName,
        provider: ai.provider || "AI",
        emoji: ai.emoji || "🤖",
        keywords: Array.from(
          new Set([normalizedAlias, normalizedName, normalizedProvider, ...keywords])
        ).filter(Boolean),
      };
    });
  }, []);

  const normalizedTerm = searchTerm?.trim().toLowerCase() || "";

  const filteredAIs = useMemo(() => {
    return mentionOptions
      .map((opt) => ({ ...opt, score: computeScore(normalizedTerm, opt) }))
      .filter((opt) => (normalizedTerm ? opt.score < Number.POSITIVE_INFINITY : true))
      .sort((a, b) => a.score !== b.score ? a.score - b.score : a.displayName.localeCompare(b.displayName));
  }, [mentionOptions, normalizedTerm]);

  // Loading shimmer on search change
  useEffect(() => {
    if (!normalizedTerm) { setIsLoading(false); return; }
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), SEARCH_LOADING_MS);
    return () => clearTimeout(t);
  }, [normalizedTerm]);

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setView("list");
      setSelectedItem(null);
      setActiveIndex(0);
    }
  }, [isOpen]);

  // Return to list when search term changes while detail is open
  useEffect(() => {
    if (view === "detail" && normalizedTerm) {
      setView("list");
      setSelectedItem(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedTerm]);

  useEffect(() => {
    if (isOpen) setActiveIndex(0);
  }, [isOpen, filteredAIs.length]);

  const openDetail = (item: MentionOption) => {
    setSelectedItem(item);
    setView("detail");
  };

  const confirmSelect = () => {
    if (selectedItem) {
      onSelect(selectedItem.name);
      setView("list");
      setSelectedItem(null);
    }
  };

  // Keyboard handler — capture phase so Enter never leaks to the form
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (view === "detail") { setView("list"); setSelectedItem(null); }
        else onClose();
        return;
      }

      if (view === "list") {
        if (e.key === "ArrowDown" && filteredAIs.length > 0) {
          e.preventDefault(); e.stopPropagation();
          setActiveIndex((p) => (p + 1) % filteredAIs.length);
        } else if (e.key === "ArrowUp" && filteredAIs.length > 0) {
          e.preventDefault(); e.stopPropagation();
          setActiveIndex((p) => (p - 1 + filteredAIs.length) % filteredAIs.length);
        } else if (e.key === "Enter" && filteredAIs.length > 0) {
          e.preventDefault(); e.stopPropagation();
          const item = filteredAIs[activeIndex] ?? filteredAIs[0];
          if (item) openDetail(item);
        }
      } else if (view === "detail") {
        if (e.key === "Enter") {
          e.preventDefault(); e.stopPropagation();
          confirmSelect();
        }
      }
    };

    // Capture phase — runs before React synthetic events on textarea
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, filteredAIs, isOpen, view, selectedItem]);

  // Click outside
  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [isOpen, onClose]);

  const safePos = useMemo<DialogPosition>(() => {
    if (position && typeof position.x === "number" && typeof position.y === "number") return position;
    if (typeof window !== "undefined") return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    return { x: 0, y: 0 };
  }, [position]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dialogRef}
          className="fixed z-[9999] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/80 w-80 dark:bg-slate-900/95 dark:border-slate-700 dark:text-slate-100 overflow-hidden"
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.97 }}
          transition={DIALOG_SPRING}
          style={{
            left: safePos.x,
            top: safePos.y - DIALOG_Y_OFFSET,
            transform: "translateY(-100%)",
          }}
        >
          <AnimatePresence mode="wait">
            {view === "list" ? (
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
                <div
                  ref={listRef}
                  className="px-2 py-2 max-h-72 overflow-y-auto no-scrollbar"
                  role="listbox"
                >
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
                          onClick={() => openDetail(ai)}
                          onMouseEnter={() => setActiveIndex(index)}
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
            ) : (
              selectedItem && (
                <DetailView
                  key="detail"
                  item={selectedItem}
                  onBack={() => { setView("list"); setSelectedItem(null); }}
                  onConfirm={confirmSelect}
                />
              )
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AISelectionDialog;
