/**
 * AI Chat Real-time Server
 * Express + Socket.IO server for real-time AI chat
 */

import express from "express";
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
import { createRedisClient } from "./services/RedisClient.js";
import { ChatAssistantService } from "./services/ChatAssistantService.js";

dotenv.config();

const AI_DISPLAY_INFO = {
  OPENAI_GPT4O: {
    displayName: "GPT-4o",
    alias: "gpt-4o",
    emoji: "🧠",
  },
  OPENAI_GPT5: {
    displayName: "GPT-5",
    alias: "gpt-5",
    emoji: "🚀",
  },
  OPENAI_GPT35_TURBO: {
    displayName: "GPT-3.5 Turbo",
    alias: "gpt-3-5",
    emoji: "💡",
  },
  ANTHROPIC_CLAUDE3_7_SONNET: {
    displayName: "Claude 3.7 Sonnet",
    alias: "claude",
    emoji: "🤖",
  },
  ANTHROPIC_CLAUDE_SONNET_4: {
    displayName: "Claude Sonnet 4",
    alias: "claude",
    emoji: "🤖",
  },
  GROK_GROK_3: {
    displayName: "Grok 3",
    alias: "grok",
    emoji: "🦾",
  },
  GEMINI_GEMINI_PRO: {
    displayName: "Gemini Pro",
    alias: "gemini",
    emoji: "💎",
  },
  MISTRAL_MISTRAL_LARGE: {
    displayName: "Mistral Large",
    alias: "mistral",
    emoji: "🌟",
  },
  COHERE_COMMAND_A_03_2025: {
    displayName: "Command A 2025",
    alias: "cohere",
    emoji: "🔮",
  },
  DEEPSEEK_DEEPSEEK_CHAT: {
    displayName: "DeepSeek Chat",
    alias: "deepseek",
    emoji: "🔍",
  },
};

const allowedOrigins = "*";

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

const PORT = process.env.PORT || 3001;

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

  app.get("*", (req, res, next) => {
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
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: Date.now(),
    uptime: process.uptime(),
  });
});

// API endpoints
app.get("/api/stats", (req, res) => {
  try {
    const stats = global.socketController.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to get stats" });
  }
});

app.get("/api/metrics", (req, res) => {
  try {
    const metrics = global.metricsService.getDetailedMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: "Failed to get metrics" });
  }
});

app.get("/api/metrics/history", (req, res) => {
  try {
    const duration = req.query.duration
      ? parseInt(req.query.duration)
      : undefined;
    const history = global.metricsService.getMetricsHistory(duration);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: "Failed to get metrics history" });
  }
});

app.get("/api/rooms", (req, res) => {
  try {
    const rooms = global.socketController.roomManager.getRoomList();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: "Failed to get rooms" });
  }
});

// Initialize AI Chat System
async function initializeAISystem() {
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
  const aiConfigs = [];
  const addConfig = (providerKey, modelKey) => {
    const config = { providerKey, modelKey };
    const key = `${providerKey}_${modelKey}`;
    if (AI_DISPLAY_INFO[key]) {
      Object.assign(config, AI_DISPLAY_INFO[key]);
    }
    aiConfigs.push(config);
  };

  if (process.env.OPENAI_API_KEY) {
    addConfig("OPENAI", "GPT5");
    addConfig("OPENAI", "GPT4O");
    addConfig("OPENAI", "GPT35_TURBO");
  }

  if (process.env.ANTHROPIC_API_KEY) {
    addConfig("ANTHROPIC", "CLAUDE3_7_SONNET");
    addConfig("ANTHROPIC", "CLAUDE_SONNET_4");
  }

  if (process.env.GROK_API_KEY) {
    addConfig("GROK", "GROK_3");
  }

  if (process.env.GOOGLE_AI_API_KEY) {
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
  }

  if (aiConfigs.length === 0) {
    console.warn(
      "⚠️  No AI API keys found! Please set API keys in environment variables."
    );
    console.warn(
      "Available keys: OPENAI_API_KEY, ANTHROPIC_API_KEY, GROK_API_KEY, GOOGLE_AI_API_KEY, MISTRAL_API_KEY, COHERE_API_KEY, DEEPSEEK_API_KEY"
    );

    // Add a mock AI for testing
    aiConfigs.push({ providerKey: "MOCK", modelKey: "MOCK_AI" });
  }

  // Initialize AIs
  try {
    await orchestrator.initializeAIs(aiConfigs);
    console.log(`✅ Initialized ${aiConfigs.length} AI services`);
  } catch (error) {
    console.error("❌ Failed to initialize some AI services:", error);
  }

  return orchestrator;
}

// Initialize and start server
async function startServer() {
  let redisClient = null;
  let metricsService = null;
  let chatOrchestrator = null;
  try {
    // Initialize AI system
    chatOrchestrator = await initializeAISystem();
    redisClient = await createRedisClient();

    // Create metrics service
    metricsService = new MetricsService(io, { redisClient });
    await metricsService.initialize();
    global.metricsService = metricsService;

    let chatAssistantService = null;
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
          if (global.socketController) {
            global.socketController.chatAssistantService = null;
            global.socketController.chatAssistantMetadata = null;
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

    // Create socket controller
    global.socketController = new SocketController(
      io,
      chatOrchestrator,
      global.metricsService,
      redisClient,
      { chatAssistantService }
    );

    // Handle Socket.IO connections
    io.on("connection", (socket) => {
      console.log(`📱 New WebSocket connection: ${socket.id}`);
      global.socketController.handleConnection(socket);
    });

    // Debug Socket.IO events
    io.engine.on("connection_error", (err) => {
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
    const cleanup = async () => {
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
    const handleShutdown = (signal) => {
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
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

// Start the server
startServer();
