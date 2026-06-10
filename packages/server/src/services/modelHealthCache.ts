/**
 * Model Health Cache
 *
 * Persists per-model health-check results in model-health.json so server
 * restarts can trust recently verified models instead of re-pinging all of
 * them (stale-while-revalidate). Entries are keyed by participant ID and
 * store the provider model id string, so a model-version change invalidates
 * the entry automatically.
 *
 * The cache is an optimization, not the source of participants — read or
 * write failures only warn and never block startup.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";

const CACHE_FILE_NAME = "model-health.json";
const LOG_PREFIX = "[model-health]";

export const DEFAULT_HEALTH_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export type HealthCacheEntry = {
  /** Provider model id string at the time of the check (e.g. "gpt-5.5"). */
  modelId: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
  lastError?: string;
  httpStatus?: number;
};

export type ModelHealthCache = {
  updatedAt: string;
  entries: Record<string, HealthCacheEntry>;
};

// Support override via env var so Docker volume mounts can target a known path
const getCachePath = (): string =>
  process.env.MODEL_HEALTH_PATH ?? path.resolve(process.cwd(), CACHE_FILE_NAME);

export const getHealthTtlMs = (): number =>
  Number(process.env.AI_CHAT_HEALTH_TTL_MS) || DEFAULT_HEALTH_TTL_MS;

export const readHealthCache = (): ModelHealthCache | null => {
  const cachePath = getCachePath();
  if (!existsSync(cachePath)) return null;
  try {
    return JSON.parse(readFileSync(cachePath, "utf-8")) as ModelHealthCache;
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} Failed to read ${cachePath}:`,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
};

const writeHealthCache = (cache: ModelHealthCache): void => {
  const cachePath = getCachePath();
  try {
    writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf-8");
  } catch (error) {
    console.warn(
      `${LOG_PREFIX} Failed to write ${cachePath} (continuing without persistence):`,
      error instanceof Error ? error.message : String(error),
    );
  }
};

// ── Trust decision (pure) ─────────────────────────────────────────────────────

export type ClassifyOptions = {
  ttlMs: number;
  /** Epoch ms; defaults to Date.now(). */
  now?: number;
  /** Ignore the cache entirely (AI_CHAT_RECHECK_AVAILABILITY). */
  recheckAll?: boolean;
};

const isTrusted = (
  entry: HealthCacheEntry | undefined,
  modelId: string,
  ttlMs: number,
  now: number,
): boolean => {
  if (!entry || entry.modelId !== modelId || !entry.lastSuccessAt) return false;
  const successAt = Date.parse(entry.lastSuccessAt);
  if (Number.isNaN(successAt) || now - successAt >= ttlMs) return false;
  // A failure newer than the last success means the model regressed
  const failureAt = entry.lastFailureAt ? Date.parse(entry.lastFailureAt) : NaN;
  return Number.isNaN(failureAt) || failureAt < successAt;
};

/**
 * Splits models into cache-trusted ones and ones needing a health check.
 * Trusted = cached success for the same model id, within TTL, and not
 * superseded by a newer failure.
 */
export const classifyModels = <T extends { id: string; modelId: string }>(
  models: T[],
  cache: ModelHealthCache | null,
  options: ClassifyOptions,
): { trusted: T[]; toCheck: T[] } => {
  const { ttlMs, now = Date.now(), recheckAll = false } = options;
  const trusted: T[] = [];
  const toCheck: T[] = [];

  for (const model of models) {
    const entry = recheckAll ? undefined : cache?.entries[model.id];
    if (isTrusted(entry, model.modelId, ttlMs, now)) {
      trusted.push(model);
    } else {
      toCheck.push(model);
    }
  }

  return { trusted, toCheck };
};

// ── Recording results ─────────────────────────────────────────────────────────

/** Extracts HTTP status code from error strings like "...with status 400" or "status code 404". */
export const extractHttpStatus = (error?: string): number | undefined => {
  if (!error) return undefined;
  const match = error.match(/\bstatus(?:\s+code)?\s+(\d{3})\b/i);
  return match ? parseInt(match[1], 10) : undefined;
};

const updateEntry = (
  participantId: string,
  update: (existing: HealthCacheEntry | undefined) => HealthCacheEntry,
): void => {
  const cache = readHealthCache() ?? { updatedAt: "", entries: {} };
  cache.entries[participantId] = update(cache.entries[participantId]);
  cache.updatedAt = new Date().toISOString();
  writeHealthCache(cache);
};

export const recordSuccess = (participantId: string, modelId: string): void => {
  updateEntry(participantId, (existing) => ({
    ...existing,
    modelId,
    lastSuccessAt: new Date().toISOString(),
    lastError: undefined,
    httpStatus: undefined,
  }));
};

export const recordFailure = (
  participantId: string,
  modelId: string,
  error: string,
): void => {
  updateEntry(participantId, (existing) => ({
    ...existing,
    modelId,
    lastFailureAt: new Date().toISOString(),
    lastError: error,
    httpStatus: extractHttpStatus(error),
  }));
};
