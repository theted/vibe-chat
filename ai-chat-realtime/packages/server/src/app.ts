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
import { AI_DISPLAY_INFO, ChatOrchestrator } from "@ai-chat/core";
import { SocketController } from "./controllers/SocketController.js";
import { MetricsService } from "./services/MetricsService.js";
import { createRedisClient, type RedisClient } from "./services/RedisClient.js";
import { ChatAssistantService } from "./services/ChatAssistantService.js";

dotenv.config();

type AIConfig = {
  providerKey: string;
  modelKey: string;
  displayName?: string;
  alias?: string;
  emoji?: string;
};

const OPENAI_MODEL_KEYS = [
  "GPT5",
  "GPT5_1",
  "GPT5_1_MINI",
  "GPT5_2",
  "GPT4_1",
  "GPT4O",
  "O3",
  "O3_MINI",
  "O4_MINI",
  "GPT35_TURBO",
];

const allowedOrigins = "*";

const parseModelAllowlist = (
  envVarName: string,
  validKeys: string[]
): string[] => {
  const rawList = process.env[envVarName];
  if (!rawList) {
    return [];
  }
  const normalized = rawList
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/-/g, "_").toUpperCase());
  return normalized.filter((item) => validKeys.includes(item));
};

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

  // Define AI configurations - only initialize AIs with valid API keys
  const aiConfigs: AIConfig[] = [];
  const addConfig = (providerKey: string, modelKey: string): void => {
    const config: AIConfig = { providerKey, modelKey };
    const key = `${providerKey}_${modelKey}`;
    if (AI_DISPLAY_INFO[key]) {
      Object.assign(config, AI_DISPLAY_INFO[key]);
    }
    aiConfigs.push(config);
  };

  if (process.env.OPENAI_API_KEY) {
    const defaultOpenAIModels = [
      "GPT5",
      "GPT5_1",
      "GPT5_2",
      "GPT4_1",
      "GPT4O",
      "GPT35_TURBO",
    ];
    const allowlist = parseModelAllowlist(
      "OPENAI_MODEL_ALLOWLIST",
      OPENAI_MODEL_KEYS
    );
    if (process.env.OPENAI_MODEL_ALLOWLIST && allowlist.length === 0) {
      console.warn(
        "⚠️  OPENAI_MODEL_ALLOWLIST did not match any supported OpenAI models; using defaults."
      );
    }
    const selectedModels =
      allowlist.length > 0 ? allowlist : defaultOpenAIModels;
    selectedModels.forEach((modelKey) => addConfig("OPENAI", modelKey));
  }

  if (process.env.ANTHROPIC_API_KEY) {
    addConfig("ANTHROPIC", "CLAUDE_OPUS_4_5");
    addConfig("ANTHROPIC", "CLAUDE_SONNET_4_5");
    addConfig("ANTHROPIC", "CLAUDE_OPUS_4_1");
    addConfig("ANTHROPIC", "CLAUDE_OPUS_4");
    addConfig("ANTHROPIC", "CLAUDE_SONNET_4");
    addConfig("ANTHROPIC", "CLAUDE3_7_SONNET");
    addConfig("ANTHROPIC", "CLAUDE_HAIKU_4_5");
    addConfig("ANTHROPIC", "CLAUDE3_5_HAIKU_20241022");
  }

  if (process.env.GROK_API_KEY) {
    addConfig("GROK", "GROK_4_0709");
    addConfig("GROK", "GROK_3");
    addConfig("GROK", "GROK_3_MINI");
    addConfig("GROK", "GROK_4_FAST_REASONING");
    addConfig("GROK", "GROK_4_FAST_NON_REASONING");
    addConfig("GROK", "GROK_CODE_FAST_1");
  }

  if (process.env.GOOGLE_AI_API_KEY) {
    addConfig("GEMINI", "GEMINI_25");
    addConfig("GEMINI", "GEMINI_PRO");
  }

  if (process.env.MISTRAL_API_KEY) {
    addConfig("MISTRAL", "MISTRAL_LARGE");
  }

  if (process.env.COHERE_API_KEY) {
    addConfig("COHERE", "COMMAND_A_03_2025");
  }

  if (process.env.DEEPSEEK_API_KEY) {
    addConfig("DEEPSEEK", "DEEPSEEK_CHAT");
    addConfig("DEEPSEEK", "DEEPSEEK_V3");
    addConfig("DEEPSEEK", "DEEPSEEK_V3_2");
  }

  if (process.env.KIMI_API_KEY) {
    addConfig("KIMI", "KIMI_8K");
  }

  if (process.env.Z_API_KEY) {
    addConfig("ZAI", "ZAI_DEFAULT");
  }

  if (aiConfigs.length === 0) {
    console.warn(
      "⚠️  No AI API keys found! Please set API keys in environment variables."
    );
    console.warn(
      "Available keys: OPENAI_API_KEY, ANTHROPIC_API_KEY, GROK_API_KEY, GOOGLE_AI_API_KEY, MISTRAL_API_KEY, COHERE_API_KEY, DEEPSEEK_API_KEY, KIMI_API_KEY, Z_API_KEY"
    );

    // Add a mock AI for testing
    aiConfigs.push({ providerKey: "MOCK", modelKey: "MOCK_AI" });
  }

  // Initialize AIs
  try {
    await orchestrator.initializeAIs(aiConfigs);

    // Get actually initialized models
    const initializedModels = Array.from(orchestrator.aiServices.values());
    console.log(`✅ Initialized ${initializedModels.length}/${aiConfigs.length} AI services`);

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
      console.warn(`⚠️  ${aiConfigs.length - initializedModels.length} model(s) failed to initialize`);
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
