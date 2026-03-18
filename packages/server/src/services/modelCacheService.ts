/**
 * Model Cache Service
 *
 * Reads/writes models.json to cache model availability state.
 * Avoids wasteful health checks on every startup by trusting
 * previously verified availability.
 *
 * Also manages startup-log.json — an append-only log of every startup's
 * activation results, used to fast-boot with --use-last-working.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";

const CACHE_FILE_NAME = "models.json";
const LOG_FILE_NAME = "startup-log.json";
const MAX_LOG_ENTRIES = 50;

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
  }> = [],
): ModelCache => {
  const now = new Date().toISOString();
  return {
    lastUpdated: now,
    models: (results ?? []).map((r) => ({
      checkedAt: now,
      provider: r.providerKey,
      model: r.modelKey,
      status: r.status,
      ...(r.error ? { error: r.error } : {}),
    })),
  };
};

// ── Startup log ──────────────────────────────────────────────────────────────

export type StartupMode =
  | "healthcheck"
  | "cached"
  | "use-last-working"
  | "skip-healthcheck";

export type StartupLogParticipant = {
  provider: string;
  model: string;
  success: boolean;
  error?: string;
};

export type StartupLogEntry = {
  startedAt: string;
  mode: StartupMode;
  participants: StartupLogParticipant[];
};

const getLogPath = (): string =>
  path.resolve(process.cwd(), LOG_FILE_NAME);

export const readStartupLog = (): StartupLogEntry[] => {
  const logPath = getLogPath();
  if (!existsSync(logPath)) return [];
  try {
    return JSON.parse(readFileSync(logPath, "utf-8")) as StartupLogEntry[];
  } catch {
    return [];
  }
};

export const appendStartupLog = (entry: StartupLogEntry): void => {
  const logPath = getLogPath();
  let log = readStartupLog();
  log.push(entry);
  if (log.length > MAX_LOG_ENTRIES) log = log.slice(-MAX_LOG_ENTRIES);
  try {
    writeFileSync(logPath, JSON.stringify(log, null, 2), "utf-8");
  } catch (error) {
    console.warn(
      "⚠️  Failed to write startup-log.json:",
      error instanceof Error ? error.message : String(error),
    );
  }
};

/** Returns the last startup's successful participants, for use with --use-last-working. */
export const getLastWorkingModels = (): Array<{ provider: string; model: string }> => {
  const log = readStartupLog();
  if (log.length === 0) return [];
  return log[log.length - 1].participants
    .filter((p) => p.success)
    .map(({ provider, model }) => ({ provider, model }));
};

/**
 * Returns all participants that successfully activated in the last startup.
 * Full participant objects — useful for display, filtering, or re-seeding state.
 */
export const getValidParticipants = (log = readStartupLog()): StartupLogParticipant[] => {
  if (log.length === 0) return [];
  return log[log.length - 1].participants.filter((p) => p.success);
};

/**
 * Returns a map of `PROVIDER_MODEL` → error reason for every participant
 * that failed in the last startup. Useful for surfacing failure reasons
 * in admin UIs or diagnostics without parsing raw log arrays.
 *
 * Example: { "OPENAI_GPT_4O": "401 Unauthorized", "MISTRAL_MISTRAL_LARGE": "timeout" }
 */
export const getParticipantErrors = (log = readStartupLog()): Record<string, string> => {
  if (log.length === 0) return {};
  return log[log.length - 1].participants
    .filter((p) => !p.success)
    .reduce<Record<string, string>>((acc, { provider, model, error }) => {
      acc[`${provider}_${model}`] = error ?? "unknown error";
      return acc;
    }, {});
};
