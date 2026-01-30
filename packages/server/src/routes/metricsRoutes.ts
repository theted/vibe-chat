import { Router, type Request, type Response } from "express";
import type { MetricsService } from "@/services/MetricsService.js";

type MetricsRouteDeps = {
  getMetricsService: () => MetricsService | undefined;
};

const parseDuration = (value: unknown): number | undefined => {
  if (typeof value !== "string") {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const createMetricsRouter = ({
  getMetricsService,
}: MetricsRouteDeps): Router => {
  const router = Router();

  router.get("/api/metrics", (req: Request, res: Response) => {
    try {
      const metricsService = getMetricsService();
      if (!metricsService) {
        res.status(503).json({ error: "Metrics service not ready" });
        return;
      }
      const metrics = metricsService.getDetailedMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to get metrics" });
    }
  });

  router.get("/api/metrics/history", (req: Request, res: Response) => {
    try {
      const metricsService = getMetricsService();
      if (!metricsService) {
        res.status(503).json({ error: "Metrics service not ready" });
        return;
      }
      const duration = parseDuration(req.query.duration);
      const history = metricsService.getMetricsHistory(duration);
      res.json(history);
    } catch (error) {
      res.status(500).json({ error: "Failed to get metrics history" });
    }
  });

  return router;
};
