/**
 * In-memory sliding-window cap on issues filed. Process-local: a restart
 * forgets recent filings, which at worst allows one extra burst - accepted
 * over adding Redis to this package.
 */

import { ISSUE_CREATE_LIMITS } from "./constants.js";

type IssueLimit = { windowMs: number; maxIssues: number };

/** A full window, and how long until it has room again. */
export type IssueLimitBlock = { retryAfterMs: number; limit: IssueLimit };

/** Pure check: the full window with the longest wait, or null if none is full. */
export const checkIssueLimits = (
  filedAt: number[],
  now: number,
  limits: readonly IssueLimit[] = ISSUE_CREATE_LIMITS,
): IssueLimitBlock | null => {
  for (const limit of [...limits].sort((a, b) => b.windowMs - a.windowMs)) {
    const inWindow = filedAt.filter((time) => now - time < limit.windowMs);
    if (inWindow.length >= limit.maxIssues) {
      const oldest = Math.min(...inWindow);
      return { retryAfterMs: oldest + limit.windowMs - now, limit };
    }
  }
  return null;
};

export class IssueLimiter {
  private filedAt: number[] = [];

  constructor(
    private readonly limits: readonly IssueLimit[] = ISSUE_CREATE_LIMITS,
  ) {}

  /** The blocking window, or null when another issue may be filed. */
  check(now = Date.now()): IssueLimitBlock | null {
    return checkIssueLimits(this.filedAt, now, this.limits);
  }

  record(now = Date.now()): void {
    const longest = Math.max(...this.limits.map(({ windowMs }) => windowMs));
    this.filedAt = [
      ...this.filedAt.filter((time) => now - time < longest),
      now,
    ];
  }
}
