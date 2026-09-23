/**
 * FavoritesView — displays all starred/saved snippets from localStorage.
 * Will migrate to DB-backed storage once proper auth exists.
 */

import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useFavorites } from "@/hooks/useFavorites";
import FavoriteSnippetCard from "@/components/FavoriteSnippetCard";
import Icon from "@/components/Icon";
import StarIcon from "@/components/StarIcon";

const EmptyState = () => (
  <div className="flex flex-col items-center gap-3 py-24 text-center">
    <StarIcon className="h-8 w-8 text-faint" />
    <div>
      <p className="font-medium text-fg">No saved snippets yet</p>
      <p className="mt-1 text-sm text-muted">
        Hover a message and click the star to save it here.
      </p>
    </div>
    <Link
      to="/"
      className="mt-2 text-sm font-semibold text-accent hover:underline"
    >
      Go to chat
    </Link>
  </div>
);

const FavoritesView = () => {
  const { favorites, removeFavorite, clearAll } = useFavorites();

  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-line bg-canvas px-4 sm:px-6">
        <Link
          to="/"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-raised hover:text-fg"
          aria-label="Back to chat"
          title="Back to chat"
        >
          <Icon name="chevron-right" className="h-4 w-4 rotate-180" />
        </Link>
        <h1 className="font-display text-lg font-bold">Favorites</h1>
        <span className="text-sm tabular-nums text-faint">
          {favorites.length}
        </span>
        {favorites.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:bg-raised hover:text-danger"
          >
            Clear all
          </button>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {favorites.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            <AnimatePresence mode="popLayout">
              {[...favorites].reverse().map((snippet) => (
                <FavoriteSnippetCard
                  key={snippet.id}
                  snippet={snippet}
                  onRemove={removeFavorite}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
      </main>
    </div>
  );
};

export default FavoritesView;
