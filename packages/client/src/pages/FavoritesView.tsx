/**
 * FavoritesView — displays all starred/saved snippets from localStorage.
 * Will migrate to DB-backed storage once proper auth exists.
 */

import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useFavorites } from "@/hooks/useFavorites";
import Icon from "@/components/Icon";
import type { FavoriteSnippet } from "@/types";

const formatDate = (ts: number): string =>
  new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const SENDER_TYPE_BADGE: Record<string, string> = {
  user: "bg-primary-500/15 border-primary-400/40 text-primary-300",
  ai: "bg-teal-500/15 border-teal-400/40 text-teal-300",
  system: "bg-amber-500/15 border-amber-400/40 text-amber-300",
};

interface SnippetCardProps {
  snippet: FavoriteSnippet;
  onRemove: (id: string) => void;
}

const SnippetCard = ({ snippet, onRemove }: SnippetCardProps) => {
  const badgeClass =
    SENDER_TYPE_BADGE[snippet.senderType] ?? SENDER_TYPE_BADGE.ai;
  const displayName =
    snippet.emoji
      ? `${snippet.emoji} ${snippet.displayName ?? snippet.sender}`
      : snippet.displayName ?? snippet.sender;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="glass-surface group relative rounded-2xl border border-white/8 bg-white/4 backdrop-blur-md dark:border-teal-600/15 dark:bg-[rgba(0,22,32,0.55)] overflow-hidden"
    >
      {/* Starred indicator — glowing amber top edge */}
      <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-slate-200 dark:text-slate-100">
              {displayName}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wider ${badgeClass}`}>
              {snippet.senderType}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onRemove(snippet.id)}
            title="Remove from favorites"
            aria-label="Remove from favorites"
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all duration-150 opacity-0 group-hover:opacity-100"
          >
            <Icon name="x-mark" className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <p className="text-sm text-slate-300 dark:text-slate-200 leading-relaxed line-clamp-4 whitespace-pre-wrap break-words">
          {snippet.content}
        </p>

        {/* Footer row */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/6 dark:border-teal-600/10">
          <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-500">
            {/* Filled star */}
            <svg className="w-3 h-3 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3l2.6 5.27 5.82.85-4.21 4.1.99 5.78L12 16.77l-5.2 2.73.99-5.78L3.58 9.62l5.82-.85L12 3z" />
            </svg>
            Saved {formatDate(snippet.savedAt)}
          </div>
          <span className="text-[11px] text-slate-600 dark:text-slate-600">
            {formatDate(snippet.timestamp)}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

const EmptyState = () => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: 0.2 }}
    className="flex flex-col items-center justify-center gap-4 py-24 text-center"
  >
    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
      <svg className="w-8 h-8 text-amber-400/60" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3l2.6 5.27 5.82.85-4.21 4.1.99 5.78L12 16.77l-5.2 2.73.99-5.78L3.58 9.62l5.82-.85L12 3z" />
      </svg>
    </div>
    <div>
      <p className="text-slate-300 font-medium">No saved snippets yet</p>
      <p className="text-sm text-slate-500 mt-1">
        Hover a message and click the star to save it here.
      </p>
    </div>
    <Link
      to="/"
      className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary-500/20 border border-primary-500/40 px-5 py-2 text-sm font-medium text-primary-300 hover:bg-primary-500/30 transition-colors"
    >
      <Icon name="chat" className="w-4 h-4" />
      Go to chat
    </Link>
  </motion.div>
);

export default function FavoritesView() {
  const { favorites, removeFavorite, clearAll } = useFavorites();

  return (
    <div className="min-h-screen dark">
      {/* ── Header ── */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/6 dark:border-teal-600/15 backdrop-blur-md bg-[rgba(0,12,20,0.80)]"
      >
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/8 transition-all"
            title="Back to chat"
            aria-label="Back to chat"
          >
            <Icon name="chevron-right" className="w-4 h-4 rotate-180" />
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3l2.6 5.27 5.82.85-4.21 4.1.99 5.78L12 16.77l-5.2 2.73.99-5.78L3.58 9.62l5.82-.85L12 3z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-100">Favorites</h1>
              <p className="text-xs text-slate-500">
                {favorites.length} saved {favorites.length === 1 ? "snippet" : "snippets"}
              </p>
            </div>
          </div>
        </div>

        {favorites.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-slate-500 hover:text-rose-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-500/10"
          >
            Clear all
          </button>
        )}
      </motion.header>

      {/* ── Content ── */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {favorites.length === 0 ? (
          <EmptyState />
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="grid gap-4">
              {[...favorites].reverse().map((snippet) => (
                <SnippetCard
                  key={snippet.id}
                  snippet={snippet}
                  onRemove={removeFavorite}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
