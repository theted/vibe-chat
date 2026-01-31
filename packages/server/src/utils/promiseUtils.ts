/**
 * Shared promise utility functions
 */

/**
 * Wrap a promise with a timeout, rejecting if the timeout is reached first
 */
export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  createTimeoutError?: string | (() => Error)
): Promise<T> => {
  if (!timeoutMs || Number.isNaN(timeoutMs) || timeoutMs <= 0) {
    return promise;
  }

  let timeoutId: NodeJS.Timeout | null = null;

  try {
    return await Promise.race<T>([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => {
          const error =
            typeof createTimeoutError === "function"
              ? createTimeoutError()
              : new Error(
                  typeof createTimeoutError === "string"
                    ? createTimeoutError
                    : `Operation timed out after ${timeoutMs}ms`
                );
          reject(error);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};
