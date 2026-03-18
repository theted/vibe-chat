/**
 * Model Cache Service
 *
 * Manages two files:
 *   models.json       — healthcheck cache (legacy, kept for tooling compat)
 *   startup-log.json  — per-startup activation log, written per-model in real time
 *
 * startup-log.json is the source of truth for smart startup caching.
 * Every write attempt is logged to console. Any write failure crashes the process.
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  accessSync,
  constants,
} from "fs";
import path from "path";

const CACHE_FILE_NAME = "models.json";
const LOG_FILE_NAME = "startup-log.json";
const MAX_LOG_ENTRIES = 50;
const LOG_PREFIX = "[startup-log]";

// Support override via env var so Docker volume mounts can target a known path
const getLogPath = (): string =>
  process.env.STARTUP_LOG_PATH ?? path.resolve(process.cwd(), LOG_FILE_NAME);

const getCachePath = (): string =>
  path.resolve(process.cwd(), CACHE_FILE_NAME);

// ── models.json (healthcheck cache) ──────────────────────────────────────────

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

export const readModelCache = (): ModelCache | null => {
  const cachePath = getCachePath();
  if (!existsSync(cachePath)) return null;
  try {
    return JSON.parse(readFileSync(cachePath, "utf-8")) as ModelCache;
  } catch (error) {
    console.warn(
      "⚠️  Failed to read models.json:",
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
      "⚠️  Failed to write models.json:",
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
    models: results.map((r) => ({
      checkedAt: now,
      provider: r.providerKey,
      model: r.modelKey,
      status: r.status,
      ...(r.error ? { error: r.error } : {}),
    })),
  };
};

// ── startup-log.json ──────────────────────────────────────────────────────────

export type StartupMode =
  | "healthcheck"       // full healthcheck — first run or --recheck-availability
  | "cached"            // log exists, trusted: no healthcheck at all
  | "try-merge"         // trust previous successes, re-check only previous failures
  | "skip-healthcheck"; // explicit flag: all configured models, no check

export type StartupLogParticipant = {
  provider: string;
  model: string;
  success: boolean;
  error?: string;
  httpStatus?: number;
};

export type StartupLogEntry = {
  startedAt: string;
  mode: StartupMode;
  participants: StartupLogParticipant[];
};

const readLog = (): StartupLogEntry[] => {
  const logPath = getLogPath();
  if (!existsSync(logPath)) return [];
  try {
    return JSON.parse(readFileSync(logPath, "utf-8")) as StartupLogEntry[];
  } catch {
    return [];
  }
};

/** Writes log array to disk. Crashes the process on any failure. */
const writeLog = (log: StartupLogEntry[]): void => {
  const logPath = getLogPath();
  console.log(`${LOG_PREFIX} Writing to ${logPath} (${log.length} entries, ${log[log.length - 1]?.participants.length ?? 0} participants in last entry)`);
  try {
    writeFileSync(logPath, JSON.stringify(log, null, 2), "utf-8");
    console.log(`${LOG_PREFIX} ✅ Write successful`);
  } catch (err) {
    console.error(`${LOG_PREFIX} ❌ FATAL: Cannot write to ${logPath}:`, err);
    process.exit(1);
  }
};

/**
 * Must be called before any other log operations.
 * Creates the file if missing, verifies write access if it exists.
 * Crashes the process if the file cannot be written.
 */
export const ensureStartupLogWritable = (): void => {
  const logPath = getLogPath();
  console.log(`${LOG_PREFIX} Checking write access: ${logPath}`);

  if (!existsSync(logPath)) {
    console.log(`${LOG_PREFIX} File not found — creating empty log`);
    try {
      writeFileSync(logPath, "[]", "utf-8");
      console.log(`${LOG_PREFIX} ✅ Created: ${logPath}`);
    } catch (err) {
      console.error(`${LOG_PREFIX} ❌ FATAL: Cannot create ${logPath}:`, err);
      process.exit(1);
    }
  } else {
    try {
      accessSync(logPath, constants.W_OK);
      console.log(`${LOG_PREFIX} ✅ File is writable: ${logPath}`);
    } catch {
      console.error(`${LOG_PREFIX} ❌ FATAL: ${logPath} exists but is not writable`);
      process.exit(1);
    }
  }
};

/**
 * Writes the initial entry for this startup (with empty participants list).
 * Per-model results are appended via appendModelToCurrentStartup.
 */
export const initStartupEntry = (entry: Omit<StartupLogEntry, "participants">): void => {
  const logPath = getLogPath();
  console.log(`${LOG_PREFIX} Initializing startup entry — mode: ${entry.mode}, startedAt: ${entry.startedAt}`);

  let log = readLog();
  log.push({ ...entry, participants: [] });
  if (log.length > MAX_LOG_ENTRIES) log = log.slice(-MAX_LOG_ENTRIES);
  writeLog(log);
};

/** Extracts HTTP status code from error strings like "...with status 400" or "status code 404". */
const extractHttpStatus = (error?: string): number | undefined => {
  if (!error) return undefined;
  const match = error.match(/\bstatus(?:\s+code)?\s+(\d{3})\b/i);
  return match ? parseInt(match[1], 10) : undefined;
};

/**
 * Appends a single model's activation result to the current startup entry.
 * Called once per model as it completes (success or fail).
 * Crashes on write failure.
 */
export const appendModelToCurrentStartup = (
  startedAt: string,
  participant: StartupLogParticipant,
): void => {
  // Promote HTTP status code to its own field if not already set
  if (!participant.success && !participant.httpStatus && participant.error) {
    participant.httpStatus = extractHttpStatus(participant.error);
  }
  const statusStr = participant.success
    ? "✅ ok"
    : `❌ fail${participant.httpStatus ? ` [HTTP ${participant.httpStatus}]` : ""}${participant.error ? ` (${participant.error.slice(0, 60)})` : ""}`;
  console.log(`${LOG_PREFIX} Model result: ${participant.provider}_${participant.model} → ${statusStr}`);

  const log = readLog();
  const entry = log.findLast((e) => e.startedAt === startedAt);
  if (!entry) {
    console.error(`${LOG_PREFIX} ❌ FATAL: no startup entry found for startedAt=${startedAt}`);
    process.exit(1);
  }
  entry.participants.push(participant);
  writeLog(log);
};

/**
 * Merges updated participant results back into the LAST log entry in-place.
 * Used by --try-merge: previously-successful entries are left untouched;
 * previously-failed entries are updated with fresh results (may flip to success).
 * Any model not previously in the entry is appended.
 */
export const mergeIntoLastStartupEntry = (updates: StartupLogParticipant[]): void => {
  const log = readLog();
  if (log.length === 0) {
    console.error(`${LOG_PREFIX} ❌ FATAL: mergeIntoLastStartupEntry called with empty log`);
    process.exit(1);
  }

  const last = log[log.length - 1];
  let merged = 0;
  let added = 0;

  for (const update of updates) {
    const key = `${update.provider}_${update.model}`;
    const existing = last.participants.find(
      (p) => `${p.provider}_${p.model}` === key,
    );
    if (existing) {
      const flipped = !existing.success && update.success;
      existing.success = update.success;
      existing.error = update.error;
      existing.httpStatus = update.httpStatus;
      const statusStr = update.success ? "✅ ok" : `❌ still failing${update.httpStatus ? ` [HTTP ${update.httpStatus}]` : ""}`;
      console.log(`${LOG_PREFIX} Merge update: ${key} → ${statusStr}${flipped ? " 🎉 (newly working!)" : ""}`);
      merged++;
    } else {
      last.participants.push(update);
      console.log(`${LOG_PREFIX} Merge add (new model): ${key} → ${update.success ? "✅ ok" : "❌ fail"}`);
      added++;
    }
  }

  console.log(`${LOG_PREFIX} Merge complete: ${merged} updated, ${added} added`);
  writeLog(log);
};

// ── Query helpers ─────────────────────────────────────────────────────────────

export const readStartupLog = (): StartupLogEntry[] => readLog();

/**
 * Returns a Set of "PROVIDER_MODEL" keys for every participant that succeeded
 * in the most recent startup. Used to decide which models can skip healthcheck.
 */
export const getPreviouslyWorkingSet = (log = readLog()): Set<string> => {
  if (log.length === 0) return new Set();
  return new Set(
    log[log.length - 1].participants
      .filter((p) => p.success)
      .map((p) => `${p.provider}_${p.model}`),
  );
};

/** Last startup's successful participants as { provider, model } pairs. */
export const getLastWorkingModels = (): Array<{ provider: string; model: string }> => {
  const log = readLog();
  if (log.length === 0) return [];
  return log[log.length - 1].participants
    .filter((p) => p.success)
    .map(({ provider, model }) => ({ provider, model }));
};

/**
 * Full participant objects for every model that succeeded in the last startup.
 */
export const getValidParticipants = (log = readLog()): StartupLogParticipant[] => {
  if (log.length === 0) return [];
  return log[log.length - 1].participants.filter((p) => p.success);
};

/**
 * Map of PROVIDER_MODEL → error reason for every model that failed last startup.
 * Example: { "OPENAI_GPT_4O": "401 Unauthorized" }
 */
export const getParticipantErrors = (log = readLog()): Record<string, string> =>
  (log.length === 0 ? [] : log[log.length - 1].participants)
    .filter((p) => !p.success)
    .reduce<Record<string, string>>((acc, { provider, model, error }) => {
      acc[`${provider}_${model}`] = error ?? "unknown error";
      return acc;
    }, {});
