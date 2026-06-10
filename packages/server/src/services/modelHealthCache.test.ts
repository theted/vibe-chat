import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import {
  classifyModels,
  extractHttpStatus,
  readHealthCache,
  recordFailure,
  recordSuccess,
  type ModelHealthCache,
} from "./modelHealthCache.js";

const HOUR_MS = 60 * 60 * 1000;
const TTL_MS = 24 * HOUR_MS;
const NOW = Date.parse("2026-06-10T12:00:00.000Z");

const at = (offsetHours: number): string =>
  new Date(NOW + offsetHours * HOUR_MS).toISOString();

const cacheWith = (
  entries: ModelHealthCache["entries"],
): ModelHealthCache => ({ updatedAt: at(0), entries });

const model = (id: string, modelId: string) => ({ id, modelId });

describe("classifyModels", () => {
  const options = { ttlMs: TTL_MS, now: NOW };

  it("trusts a fresh success with matching model id", () => {
    const cache = cacheWith({
      A_1: { modelId: "a-v1", lastSuccessAt: at(-1) },
    });
    const { trusted, toCheck } = classifyModels([model("A_1", "a-v1")], cache, options);
    expect(trusted.map((m) => m.id)).toEqual(["A_1"]);
    expect(toCheck).toEqual([]);
  });

  it("rechecks when the success is older than the TTL", () => {
    const cache = cacheWith({
      A_1: { modelId: "a-v1", lastSuccessAt: at(-25) },
    });
    const { trusted, toCheck } = classifyModels([model("A_1", "a-v1")], cache, options);
    expect(trusted).toEqual([]);
    expect(toCheck.map((m) => m.id)).toEqual(["A_1"]);
  });

  it("rechecks when the cached model id differs (model version changed)", () => {
    const cache = cacheWith({
      A_1: { modelId: "a-v1", lastSuccessAt: at(-1) },
    });
    const { toCheck } = classifyModels([model("A_1", "a-v2")], cache, options);
    expect(toCheck.map((m) => m.id)).toEqual(["A_1"]);
  });

  it("rechecks when a failure is newer than the last success", () => {
    const cache = cacheWith({
      A_1: { modelId: "a-v1", lastSuccessAt: at(-2), lastFailureAt: at(-1) },
    });
    const { toCheck } = classifyModels([model("A_1", "a-v1")], cache, options);
    expect(toCheck.map((m) => m.id)).toEqual(["A_1"]);
  });

  it("rechecks unknown models and models without a recorded success", () => {
    const cache = cacheWith({
      B_2: { modelId: "b-v1", lastFailureAt: at(-1), lastError: "boom" },
    });
    const { trusted, toCheck } = classifyModels(
      [model("A_1", "a-v1"), model("B_2", "b-v1")],
      cache,
      options,
    );
    expect(trusted).toEqual([]);
    expect(toCheck.map((m) => m.id)).toEqual(["A_1", "B_2"]);
  });

  it("rechecks everything when recheckAll is set", () => {
    const cache = cacheWith({
      A_1: { modelId: "a-v1", lastSuccessAt: at(-1) },
    });
    const { trusted, toCheck } = classifyModels(
      [model("A_1", "a-v1")],
      cache,
      { ...options, recheckAll: true },
    );
    expect(trusted).toEqual([]);
    expect(toCheck.map((m) => m.id)).toEqual(["A_1"]);
  });

  it("rechecks everything when there is no cache", () => {
    const { trusted, toCheck } = classifyModels([model("A_1", "a-v1")], null, options);
    expect(trusted).toEqual([]);
    expect(toCheck.map((m) => m.id)).toEqual(["A_1"]);
  });
});

describe("record round-trip", () => {
  let tempDir: string;
  let originalPath: string | undefined;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(tmpdir(), "model-health-"));
    originalPath = process.env.MODEL_HEALTH_PATH;
    process.env.MODEL_HEALTH_PATH = path.join(tempDir, "model-health.json");
  });

  afterEach(() => {
    if (originalPath === undefined) {
      delete process.env.MODEL_HEALTH_PATH;
    } else {
      process.env.MODEL_HEALTH_PATH = originalPath;
    }
    rmSync(tempDir, { recursive: true, force: true });
  });

  it("persists successes and failures keyed by participant id", () => {
    recordSuccess("A_1", "a-v1");
    recordFailure("B_2", "b-v1", "request failed with status 401");

    expect(existsSync(process.env.MODEL_HEALTH_PATH!)).toBe(true);
    const cache = readHealthCache();
    expect(cache?.entries.A_1.modelId).toBe("a-v1");
    expect(cache?.entries.A_1.lastSuccessAt).toBeTruthy();
    expect(cache?.entries.B_2.lastError).toContain("401");
    expect(cache?.entries.B_2.httpStatus).toBe(401);
  });

  it("a new success clears the previous error but keeps failure history", () => {
    recordFailure("A_1", "a-v1", "request failed with status 500");
    recordSuccess("A_1", "a-v1");

    const entry = readHealthCache()?.entries.A_1;
    expect(entry?.lastSuccessAt).toBeTruthy();
    expect(entry?.lastFailureAt).toBeTruthy();
    expect(entry?.lastError).toBeUndefined();
    expect(entry?.httpStatus).toBeUndefined();
  });
});

describe("extractHttpStatus", () => {
  it("parses status codes from common error formats", () => {
    expect(extractHttpStatus("API request failed with status 429")).toBe(429);
    expect(extractHttpStatus("status code 404")).toBe(404);
    expect(extractHttpStatus("connection refused")).toBeUndefined();
    expect(extractHttpStatus(undefined)).toBeUndefined();
  });
});
