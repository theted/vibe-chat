import { Router, type Request, type Response } from "express";

export const createHealthRouter = (): Router => {
  const router = Router();

  router.get("/health", (req: Request, res: Response) => {
    res.json({
      status: "ok",
      timestamp: Date.now(),
      uptime: process.uptime(),
    });
  });

  return router;
};
