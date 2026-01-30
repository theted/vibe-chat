import type { Express, NextFunction, Request, Response } from "express";
import express from "express";
import fs from "fs";
import path from "path";
import { clientBuildDir } from "../config/serverConfig.js";

export const registerStaticAssets = (app: Express): void => {
  if (!fs.existsSync(clientBuildDir)) {
    console.warn(
      "⚠️  CLIENT_BUILD_DIR not found. Static assets will not be served by the API server."
    );
    return;
  }

  console.info(`📦 Serving static client assets from ${clientBuildDir}`);
  app.use(express.static(clientBuildDir));

  app.get("*", (req: Request, res: Response, next: NextFunction) => {
    if (
      req.path.startsWith("/api") ||
      req.path === "/health" ||
      req.path.startsWith("/socket.io")
    ) {
      return next();
    }

    res.sendFile(path.join(clientBuildDir, "index.html"));
  });
};
