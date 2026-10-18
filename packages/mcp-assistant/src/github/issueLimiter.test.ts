import { describe, expect, test } from "bun:test";

import { checkIssueLimits, IssueLimiter } from "./issueLimiter";

const HOUR = 3_600_000;
const limits = [
  { windowMs: HOUR, maxIssues: 2 },
  { windowMs: 24 * HOUR, maxIssues: 3 },
];

describe("checkIssueLimits", () => {
  test("allows filing while every window has room", () => {
    expect(checkIssueLimits([0], 10, limits)).toBeNull();
  });

  test("blocks when the hour is full, until its oldest filing ages out", () => {
    expect(checkIssueLimits([0, 1_000], 2_000, limits)).toEqual({
      retryAfterMs: HOUR - 2_000,
      limit: limits[0],
    });
  });

  test("reports the day's wait when that's the window that's full", () => {
    const block = checkIssueLimits(
      [0, 2 * HOUR, 4 * HOUR],
      5 * HOUR + 1,
      limits,
    );
    expect(block?.limit).toBe(limits[1]);
    expect(block?.retryAfterMs).toBe(19 * HOUR - 1);
  });
});

test("IssueLimiter counts what it records", () => {
  const limiter = new IssueLimiter(limits);
  limiter.record(0);
  expect(limiter.check(1)).toBeNull();
  limiter.record(1);
  expect(limiter.check(2)).not.toBeNull();
  expect(limiter.check(HOUR + 1)).toBeNull();
});
