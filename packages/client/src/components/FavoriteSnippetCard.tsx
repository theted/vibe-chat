/**
 * FavoriteSnippetCard - one saved message on the favorites page
 */

import { motion } from "framer-motion";
import { voiceStyleFor } from "@/utils/voice";
import Icon from "./Icon";
import StarIcon from "./StarIcon";
import type { FavoriteSnippet } from "@/types";

const formatDate = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

interface FavoriteSnippetCardProps {
  snippet: FavoriteSnippet;
  onRemove: (id: string) => void;
}

const FavoriteSnippetCard = ({
  snippet,
  onRemove,
}: FavoriteSnippetCardProps) => {
  const isAI = snippet.senderType === "ai";
  const name = snippet.displayName ?? snippet.sender;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="group flex gap-3 bg-surface px-5 py-4"
      style={voiceStyleFor(name)}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${
          isAI
            ? "bg-voice-soft text-lg"
            : "bg-raised font-display text-sm font-bold text-muted"
        }`}
        aria-hidden="true"
      >
        {isAI ? snippet.emoji || "🤖" : name.charAt(0).toUpperCase()}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span
            className={`truncate font-display text-[15px] font-semibold ${
              isAI ? "text-voice" : "text-fg"
            }`}
          >
            {name}
          </span>
          <time className="shrink-0 text-xs text-faint">
            {formatDate(snippet.timestamp)}
          </time>
          <button
            type="button"
            onClick={() => onRemove(snippet.id)}
            aria-label="Remove from favorites"
            title="Remove from favorites"
            className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-faint opacity-0 transition hover:bg-raised hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Icon name="x-mark" className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-0.5 line-clamp-4 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-fg">
          {snippet.content}
        </p>
        <p className="mt-2 flex items-center gap-1 text-xs text-faint">
          <StarIcon className="h-3 w-3 text-accent" />
          Saved {formatDate(snippet.savedAt)}
        </p>
      </div>
    </motion.li>
  );
};

export default FavoriteSnippetCard;
