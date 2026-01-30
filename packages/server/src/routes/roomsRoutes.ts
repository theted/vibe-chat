import { Router, type Request, type Response } from "express";
import type { SocketController } from "@/controllers/SocketController.js";

type RoomsRouteDeps = {
  getSocketController: () => SocketController | undefined;
};

export const createRoomsRouter = ({
  getSocketController,
}: RoomsRouteDeps): Router => {
  const router = Router();

  router.get("/api/rooms", (req: Request, res: Response) => {
    try {
      const socketController = getSocketController();
      if (!socketController) {
        res.status(503).json({ error: "Socket controller not ready" });
        return;
      }
      const rooms = socketController.roomManager.getRoomList();
      res.json(rooms);
    } catch (error) {
      res.status(500).json({ error: "Failed to get rooms" });
    }
  });

  return router;
};
