import type { Server } from "http";
import type { ChatOrchestrator } from "@ai-chat/core";
import type { MetricsService } from "../services/MetricsService.js";
import type { RedisClient } from "../services/RedisClient.js";

interface CleanupDependencies {
  chatOrchestrator: ChatOrchestrator | null;
  metricsService: MetricsService | null;
  redisClient: RedisClient | null;
}

interface ShutdownDependencies {
  server: Server;
  cleanup: () => Promise<void>;
}

/**
 * Creates a cleanup handler for server shutdown sequences.
 */
export const createServerCleanup =
  ({ chatOrchestrator, metricsService, redisClient }: CleanupDependencies) =>
  async (): Promise<void> => {
    if (chatOrchestrator) {
      chatOrchestrator.cleanup();
    }
    if (metricsService) {
      await metricsService.flushPersistence();
    }
    if (redisClient) {
      try {
        await redisClient.quit();
        console.log("✅ Redis connection closed");
      } catch (error) {
        console.error("⚠️  Failed to close Redis connection:", error);
      }
    }
  };

/**
 * Creates a handler for graceful shutdown signals.
 */
export const createGracefulShutdownHandler = ({
  server,
  cleanup,
}: ShutdownDependencies) => {
  let isShuttingDown = false;
  return (signal: string) => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    console.log(`🛑 Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      console.log("✅ Server closed");
      cleanup().finally(() => process.exit(0));
    });
  };
};
