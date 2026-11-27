import { Router, type Request, type Response } from "express";
import type {
  DependencyCheck,
  DependencyState,
  DependencyStatus,
} from "@/services/dependencyHealth.js";

type HealthRouteDeps = {
  /** Dependency probes for /health/detailed, keyed by the name they report under. */
  checks?: Record<string, DependencyCheck>;
};

const LOG_PREFIX = "[health]";

const runCheck = async (
  name: string,
  check: DependencyCheck,
): Promise<DependencyStatus> => {
  try {
    return await check();
  } catch (error) {
    console.error(`${LOG_PREFIX} ${name} check threw:`, error);
    return { status: "down", error: "check failed" };
  }
};

export const createHealthRouter = ({
  checks = {},
}: HealthRouteDeps = {}): Router => {
  const router = Router();
  // Logged on change only: the canary and anyone else may poll this often
  const lastStates = new Map<string, DependencyState>();

  const logTransitions = (report: Record<string, DependencyStatus>) => {
    for (const [name, { status, error }] of Object.entries(report)) {
      const previous = lastStates.get(name);
      lastStates.set(name, status);
      if (status === previous) continue;
      if (status === "down") {
        console.warn(`${LOG_PREFIX} ${name} is down: ${error ?? "unknown"}`);
      } else if (previous === "down") {
        console.info(`${LOG_PREFIX} ${name} is ${status} again`);
      }
    }
  };

  // Liveness only. The Docker HEALTHCHECK and the e2e stack, which runs
  // without Redis or Chroma, poll this, so it must not depend on them.
  router.get("/health", (req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: Date.now(),
      uptime: process.uptime(),
    });
  });

  // Whether chat's dependencies answer: 503 when any configured one is down
  router.get("/health/detailed", async (req: Request, res: Response) => {
    const entries = await Promise.all(
      Object.entries(checks).map(
        async ([name, check]) => [name, await runCheck(name, check)] as const,
      ),
    );
    const report = Object.fromEntries(entries);
    logTransitions(report);

    const isHealthy = entries.every(([, { status }]) => status !== "down");
    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? "ok" : "unhealthy",
      timestamp: Date.now(),
      uptime: process.uptime(),
      checks: report,
    });
  });

  return router;
};
