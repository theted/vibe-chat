/**
 * AI Chat Real-time Server
 * Express + Socket.IO server for real-time AI chat
 */

import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ChatOrchestrator } from "@ai-chat/core";
import { SocketController } from "./controllers/SocketController.js";
import { MetricsService } from "./services/MetricsService.js";
import { createRedisClient, type RedisClient } from "./services/RedisClient.js";
import { ChatAssistantService } from "./services/ChatAssistantService.js";
import {
  type AIConfig,
  PROVIDER_ENV_VARS,
  getAvailableAIConfigs,
  getProviderAIConfigs,
} from "./config/aiModels.js";

dotenv.config();

const allowedOrigins = "*";

const app = express();
const server = createServer(app);
const globalState = globalThis as typeof globalThis & {
  socketController?: SocketController;
  metricsService?: MetricsService;
};

app.set("trust proxy", true);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: false,
    methods: ["GET", "POST"],
  },
});

const PORT = Number(process.env.PORT || 3001);

// Middleware
app.use(cors());
app.use(express.json());

// Determine client build directory for serving static assets in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultClientBuildDir = path.resolve(__dirname, "../../client/dist");
const clientBuildDir = process.env.CLIENT_BUILD_DIR
  ? path.resolve(process.env.CLIENT_BUILD_DIR)
  : defaultClientBuildDir;

if (fs.existsSync(clientBuildDir)) {
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
} else {
  console.warn(
    "⚠️  CLIENT_BUILD_DIR not found. Static assets will not be served by the API server."
  );
}

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: Date.now(),
    uptime: process.uptime(),
  });
});

// API endpoints
app.get("/api/stats", (req: Request, res: Response) => {
  try {
    if (!globalState.socketController) {
      res.status(503).json({ error: "Socket controller not ready" });
      return;
    }
    const stats = globalState.socketController.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to get stats" });
  }
});

app.get("/api/metrics", (req: Request, res: Response) => {
  try {
    if (!globalState.metricsService) {
      res.status(503).json({ error: "Metrics service not ready" });
      return;
    }
    const metrics = globalState.metricsService.getDetailedMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: "Failed to get metrics" });
  }
});

app.get("/api/metrics/history", (req: Request, res: Response) => {
  try {
    if (!globalState.metricsService) {
      res.status(503).json({ error: "Metrics service not ready" });
      return;
    }
    const durationParam = req.query.duration;
    const duration =
      typeof durationParam === "string"
        ? parseInt(durationParam, 10)
        : undefined;
    const history = globalState.metricsService.getMetricsHistory(duration);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Failed to get metrics history" });
  }
});

app.get("/api/rooms", (req: Request, res: Response) => {
  try {
    if (!globalState.socketController) {
      res.status(503).json({ error: "Socket controller not ready" });
      return;
    }
    const rooms = globalState.socketController.roomManager.getRoomList();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: "Failed to get rooms" });
  }
});

// Initialize AI Chat System
async function initializeAISystem(): Promise<ChatOrchestrator> {
  console.log("🤖 Initializing AI Chat System...");

  // Create chat orchestrator
  const orchestrator = new ChatOrchestrator({
    maxMessages: 100,
    maxAIMessages: 10,
    minUserResponseDelay: 2000,
    maxUserResponseDelay: 14000,
    minBackgroundDelay: 15000,
    maxBackgroundDelay: 45000,
    minDelayBetweenAI: 1500,
    maxDelayBetweenAI: 7000,
  });

  // Get all AI configs dynamically from AI_PROVIDERS based on available API keys
  // OpenAI supports allowlist filtering via OPENAI_MODEL_ALLOWLIST env var
  let aiConfigs: AIConfig[] = [];

  if (process.env.OPENAI_API_KEY) {
    // OpenAI supports allowlist filtering for backwards compatibility
    aiConfigs.push(...getProviderAIConfigs("OPENAI", "OPENAI_MODEL_ALLOWLIST"));
  }

  // All other providers - add all models with display info configured
  const otherProviders = Object.keys(PROVIDER_ENV_VARS).filter(
    (p) => p !== "OPENAI"
  );
  for (const providerKey of otherProviders) {
    const envVar = PROVIDER_ENV_VARS[providerKey];
    if (process.env[envVar]) {
      aiConfigs.push(...getProviderAIConfigs(providerKey));
    }
  }

  if (aiConfigs.length === 0) {
    console.warn(
      "⚠️  No AI API keys found! Please set API keys in environment variables."
    );
    const availableKeys = Object.values(PROVIDER_ENV_VARS).join(", ");
    console.warn(`Available keys: ${availableKeys}`);

    // Add a mock AI for testing
    aiConfigs.push({ providerKey: "MOCK", modelKey: "MOCK_AI" });
  }

  // Initialize AIs
  try {
    await orchestrator.initializeAIs(aiConfigs);

    // Get actually initialized models
    const initializedModels = Array.from(orchestrator.aiServices.values());
    console.log(
      `✅ Initialized ${initializedModels.length}/${aiConfigs.length} AI services`
    );

    // List successfully initialized models
    if (initializedModels.length > 0) {
      console.log("📋 Active AI models:");
      initializedModels.forEach((ai) => {
        const emoji = ai.emoji || "🤖";
        const name = ai.displayName || ai.name;
        console.log(`   ${emoji} ${name}`);
      });
    }

    // Warn about failed initializations
    if (initializedModels.length < aiConfigs.length) {
      console.warn(
        `⚠️  ${aiConfigs.length - initializedModels.length} model(s) failed to initialize`
      );
    }
  } catch (error) {
    console.error("❌ Failed to initialize some AI services:", error);
  }

  return orchestrator;
}

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
    globalState.metricsService = metricsService;

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
            }`
          );
          chatAssistantService = null;
          if (globalState.socketController) {
            globalState.socketController.chatAssistantService = null;
            globalState.socketController.chatAssistantMetadata = null;
          }
          return false;
        });
    } catch (error) {
      chatAssistantService = null;
      console.warn(
        `⚠️  Chat assistant disabled: ${
          error.message || "initialisation failed"
        }`
      );
    }

    if (!chatOrchestrator || !metricsService) {
      throw new Error("Failed to initialize server dependencies.");
    }

    // Create socket controller
    globalState.socketController = new SocketController(
      io,
      chatOrchestrator,
      metricsService,
      redisClient,
      { chatAssistantService }
    );

    // Handle Socket.IO connections
    io.on("connection", (socket) => {
      console.log(`📱 New WebSocket connection: ${socket.id}`);
      globalState.socketController?.handleConnection(socket);
    });

    // Debug Socket.IO events
    io.engine.on("connection_error", (err: Error) => {
      console.error("❌ Socket.IO connection error:", err.message);
    });

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 AI Chat Server running on port ${PORT}`);
      console.log(
        `📱 Client URL: ${process.env.CLIENT_URL || "http://localhost:3000"}`
      );
      console.log(`🔗 Socket.IO endpoint: http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📈 Stats API: http://localhost:${PORT}/api/stats`);
    });

    // Graceful shutdown
    const cleanup = async (): Promise<void> => {
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

    let isShuttingDown = false;
    const handleShutdown = (signal: string) => {
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
          flushError
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
          redisError
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
  }
);

process.on("uncaughtException", (error: Error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Start the server
startServer();
