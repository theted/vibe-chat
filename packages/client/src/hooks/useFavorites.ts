/**
 * useFavorites — manages starred snippets in localStorage.
 * Will migrate to DB-backed storage once proper auth exists.
 */

import { useState, useCallback } from "react";
import { FAVORITES_STORAGE_KEY } from "@/constants/storage";
import type { FavoriteSnippet, Message } from "@/types";

const loadFromStorage = (): FavoriteSnippet[] => {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FavoriteSnippet[]) : [];
  } catch {
    return [];
  }
};

const saveToStorage = (favorites: FavoriteSnippet[]) => {
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
};

export const useFavorites = () => {
  const [favorites, setFavorites] = useState<FavoriteSnippet[]>(loadFromStorage);

  const isFavorited = useCallback(
    (id: string) => favorites.some((f) => f.id === id),
    [favorites],
  );

  const toggleFavorite = useCallback((message: Message) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === message.id);
      const next = exists
        ? prev.filter((f) => f.id !== message.id)
        : [
            ...prev,
            {
              id: message.id,
              content: message.content,
              sender: message.sender,
              senderType: message.senderType,
              timestamp: message.timestamp,
              savedAt: Date.now(),
              displayName: message.displayName ?? message.aiName ?? message.sender,
              emoji: message.emoji ?? message.aiEmoji,
            },
          ];
      saveToStorage(next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.filter((f) => f.id !== id);
      saveToStorage(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setFavorites([]);
    localStorage.removeItem(FAVORITES_STORAGE_KEY);
  }, []);

  return { favorites, isFavorited, toggleFavorite, removeFavorite, clearAll };
};
