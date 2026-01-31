/**
 * AI Chat Real-time Server
 * Express + Socket.IO server for real-time AI chat
 */

import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { ChatOrchestrator } from "@ai-chat/core";
import { SocketController } from "./controllers/SocketController.js";
import { MetricsService } from "./services/MetricsService.js";
import { createRedisClient, type RedisClient } from "./services/RedisClient.js";
import { ChatAssistantService } from "./services/ChatAssistantService.js";
import {
  getMetricsService,
  getSocketController,
  setMetricsService,
  setSocketController,
} from "./utils/globalState.js";
import {
  createHealthRouter,
  createMetricsRouter,
  createRoomsRouter,
  createStatsRouter,
  registerStaticAssets,
} from "./routes/index.js";
import { initializeAISystem } from "./services/aiOrchestrator.js";
import {
  createGracefulShutdownHandler,
  createServerCleanup,
} from "./utils/serverLifecycle.js";
import { allowedOrigins, clientUrl, port } from "./config/serverConfig.js";

dotenv.config();

const app = express();
const server = createServer(app);

app.set("trust proxy", true);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: false,
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

registerStaticAssets(app);

app.use(createHealthRouter());
app.use(createStatsRouter({ getSocketController }));
app.use(createMetricsRouter({ getMetricsService }));
app.use(createRoomsRouter({ getSocketController }));

// Initialize and start server
async function startServer(): Promise<void> {
  let redisClient: RedisClient | null = null;
  let metricsService: MetricsService | null = null;
  let chatOrchestrator: ChatOrchestrator | null = null;
  try {
    // Initialize AI system
    chatOrchestrator = await initializeAISystem();
    redisClient = await createRedisClient();

    // Create metrics service
    metricsService = new MetricsService(io, { redisClient });
    await metricsService.initialize();
    setMetricsService(metricsService);

    let chatAssistantService: ChatAssistantService | null = null;
    try {
      chatAssistantService = new ChatAssistantService();
      chatAssistantService
        .initialise()
        .then(() => {
          console.log("💬 Chat assistant enabled for @Chat mentions.");
          return true;
        })
        .catch((error) => {
          console.warn(
            `⚠️  Chat assistant disabled: ${
              error.message || "initialisation failed"
            }`,
          );
          chatAssistantService = null;
          const socketController = getSocketController();
          if (socketController) {
            socketController.chatAssistantService = null;
            socketController.chatAssistantMetadata = null;
          }
          return false;
        });
    } catch (error) {
      chatAssistantService = null;
      console.warn(
        `⚠️  Chat assistant disabled: ${
          error.message || "initialisation failed"
        }`,
      );
    }

    if (!chatOrchestrator || !metricsService) {
      throw new Error("Failed to initialize server dependencies.");
    }

    // Create socket controller
    setSocketController(
      new SocketController(io, chatOrchestrator, metricsService, redisClient, {
        chatAssistantService,
      }),
    );

    // Handle Socket.IO connections
    io.on("connection", (socket) => {
      console.log(`📱 New WebSocket connection: ${socket.id}`);
      getSocketController()?.handleConnection(socket);
    });

    // Debug Socket.IO events
    io.engine.on("connection_error", (err: Error) => {
      console.error("❌ Socket.IO connection error:", err.message);
    });

    // Start server
    server.listen(port, () => {
      console.log(`🚀 AI Chat Server running on port ${port}`);
      console.log(`📱 Client URL: ${clientUrl}`);
      console.log(`🔗 Socket.IO endpoint: http://localhost:${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
      console.log(`📈 Stats API: http://localhost:${port}/api/stats`);
    });

    // Graceful shutdown
    const cleanup = createServerCleanup({
      chatOrchestrator,
      metricsService,
      redisClient,
    });

    const handleShutdown = createGracefulShutdownHandler({
      server,
      cleanup,
    });

    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
    process.on("SIGINT", () => handleShutdown("SIGINT"));
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    if (metricsService) {
      try {
        await metricsService.flushPersistence();
      } catch (flushError) {
        console.error(
          "⚠️  Additionally failed to flush metrics to Redis:",
          flushError,
        );
      }
    }
    if (chatOrchestrator) {
      chatOrchestrator.cleanup();
    }
    if (redisClient) {
      try {
        await redisClient.quit();
      } catch (redisError) {
        console.error(
          "⚠️  Additionally failed to close Redis connection:",
          redisError,
        );
      }
    }
    process.exit(1);
  }
}

// Error handling
process.on(
  "unhandledRejection",
  (reason: unknown, promise: Promise<unknown>) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
  },
);

process.on("uncaughtException", (error: Error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Start the server
startServer();
