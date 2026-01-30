import { Router, type Request, type Response } from "express";
import type { SocketController } from "../controllers/SocketController.js";

type StatsRouteDeps = {
  getSocketController: () => SocketController | undefined;
};

export const createStatsRouter = ({
  getSocketController,
}: StatsRouteDeps): Router => {
  const router = Router();

  router.get("/api/stats", (req: Request, res: Response) => {
    try {
      const socketController = getSocketController();
      if (!socketController) {
        res.status(503).json({ error: "Socket controller not ready" });
        return;
      }
      const stats = socketController.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  return router;
};
