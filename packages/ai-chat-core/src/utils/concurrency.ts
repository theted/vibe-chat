/**
 * Concurrency helpers.
 */

/**
 * Run async tasks with a concurrency limit. Workers pull from a shared index
 * until the task list is exhausted.
 */
export const runWithConcurrencyLimit = async (
  tasks: Array<() => Promise<void>>,
  limit: number,
): Promise<void> => {
  if (tasks.length === 0) return;

  const concurrency = Math.max(1, limit);
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, tasks.length);

  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const task = tasks[currentIndex];
      if (!task) return;
      await task();
    }
  });

  await Promise.all(workers);
};
