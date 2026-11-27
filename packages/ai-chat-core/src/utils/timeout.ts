/**
 * Timeout helpers for model calls. A provider call that never settles would
 * otherwise hold its ResponseQueue slot forever, so every call is bounded.
 */

import { DEFAULT_SERVICE_TIMEOUT_MS } from "@/config/aiProviders/constants.js";
import { ServiceTimeoutError } from "@/types/services.js";

type TimeoutOptions = {
  timeoutMs: number;
  /** Service name carried on the ServiceTimeoutError. */
  serviceName: string;
};

/**
 * The timeout for one call to a service: its configured `timeout` when it has
 * a positive one, otherwise DEFAULT_SERVICE_TIMEOUT_MS.
 */
export const resolveServiceTimeout = (config?: {
  timeout?: number;
}): number => {
  const configured = config?.timeout;
  return typeof configured === "number" && configured > 0
    ? configured
    : DEFAULT_SERVICE_TIMEOUT_MS;
};

/**
 * Run `run` and reject with a ServiceTimeoutError if it has not settled
 * within `timeoutMs`. The AbortSignal handed to `run` fires at the same
 * moment, so callers that can pass it to their HTTP client abort the request
 * itself instead of only no longer waiting for it. A result that arrives
 * after the timeout is discarded.
 *
 * @throws {ServiceTimeoutError} when the timeout fires first
 * @throws whatever `run` rejects with, unchanged
 */
export const runWithTimeout = async <T>(
  run: (signal: AbortSignal) => Promise<T>,
  { timeoutMs, serviceName }: TimeoutOptions,
): Promise<T> => {
  if (!(timeoutMs > 0)) {
    throw new Error(
      `runWithTimeout needs a positive timeoutMs, got ${timeoutMs}`,
    );
  }

  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(
        new ServiceTimeoutError(
          `${serviceName} request timed out after ${timeoutMs}ms`,
          serviceName,
          timeoutMs,
        ),
      );
    }, timeoutMs);
  });

  try {
    return await Promise.race([run(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
};
