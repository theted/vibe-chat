/**
 * Model Cache Service
 *
 * Reads/writes models.json to cache model availability state.
 * Avoids wasteful health checks on every startup by trusting
 * previously verified availability.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";

const CACHE_FILE_NAME = "models.json";

export type ModelCacheEntry = {
  checkedAt: string;
  provider: string;
  model: string;
  status: "ok" | "error";
  error?: string;
};

export type ModelCache = {
  lastUpdated: string;
  models: ModelCacheEntry[];
};

const getCachePath = (): string =>
  path.resolve(process.cwd(), CACHE_FILE_NAME);

export const readModelCache = (): ModelCache | null => {
  const cachePath = getCachePath();
  if (!existsSync(cachePath)) return null;

  try {
    const raw = readFileSync(cachePath, "utf-8");
    return JSON.parse(raw) as ModelCache;
  } catch (error) {
    console.warn(
      "⚠️  Failed to read models.json cache:",
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
};

export const writeModelCache = (cache: ModelCache): void => {
  const cachePath = getCachePath();
  try {
    writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf-8");
  } catch (error) {
    console.warn(
      "⚠️  Failed to write models.json cache:",
      error instanceof Error ? error.message : String(error),
    );
  }
};

export const buildModelCache = (
  results: Array<{
    providerKey: string;
    modelKey: string;
    status: "ok" | "error";
    error?: string;
  }>,
): ModelCache => {
  const now = new Date().toISOString();
  return {
    lastUpdated: now,
    models: results.map((r) => ({
      checkedAt: now,
      provider: r.providerKey,
      model: r.modelKey,
      status: r.status,
      ...(r.error ? { error: r.error } : {}),
    })),
  };
};
