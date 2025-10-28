/**
 * AI Chat Real-time Server
 * Express + Socket.IO server for real-time AI chat
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { ChatOrchestrator } from '@ai-chat/core';
import { SocketController } from './controllers/SocketController.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000"
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now(),
    uptime: process.uptime()
  });
});

// API endpoints
app.get('/api/stats', (req, res) => {
  try {
    const stats = socketController.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

app.get('/api/rooms', (req, res) => {
  try {
    const rooms = socketController.roomManager.getRoomList();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get rooms' });
  }
});

// Initialize AI Chat System
async function initializeAISystem() {
  console.log('🤖 Initializing AI Chat System...');
  
  // Create chat orchestrator
  const orchestrator = new ChatOrchestrator({
    maxMessages: 100,
    maxAIMessages: 10,
    minDelayBetweenAI: 10000, // 10 seconds
    maxDelayBetweenAI: 40000  // 40 seconds
  });

  // Define AI configurations - only initialize AIs with valid API keys
  const aiConfigs = [];
  
  if (process.env.OPENAI_API_KEY) {
    aiConfigs.push(
      { providerKey: 'OPENAI', modelKey: 'GPT4O' },
      { providerKey: 'OPENAI', modelKey: 'GPT35_TURBO' }
    );
  }

  if (process.env.ANTHROPIC_API_KEY) {
    aiConfigs.push(
      { providerKey: 'ANTHROPIC', modelKey: 'CLAUDE3_7_SONNET' },
      { providerKey: 'ANTHROPIC', modelKey: 'CLAUDE_SONNET_4' }
    );
  }

  if (process.env.GROK_API_KEY) {
    aiConfigs.push(
      { providerKey: 'GROK', modelKey: 'GROK_3' }
    );
  }

  if (process.env.GOOGLE_AI_API_KEY) {
    aiConfigs.push(
      { providerKey: 'GEMINI', modelKey: 'GEMINI_PRO' }
    );
  }

  if (process.env.MISTRAL_API_KEY) {
    aiConfigs.push(
      { providerKey: 'MISTRAL', modelKey: 'MISTRAL_LARGE' }
    );
  }

  if (process.env.COHERE_API_KEY) {
    aiConfigs.push(
      { providerKey: 'COHERE', modelKey: 'COMMAND_A_03_2025' }
    );
  }

  if (process.env.DEEPSEEK_API_KEY) {
    aiConfigs.push(
      { providerKey: 'DEEPSEEK', modelKey: 'DEEPSEEK_CHAT' }
    );
  }

  if (aiConfigs.length === 0) {
    console.warn('⚠️  No AI API keys found! Please set API keys in environment variables.');
    console.warn('Available keys: OPENAI_API_KEY, ANTHROPIC_API_KEY, GROK_API_KEY, GOOGLE_AI_API_KEY, MISTRAL_API_KEY, COHERE_API_KEY, DEEPSEEK_API_KEY');
    
    // Add a mock AI for testing
    aiConfigs.push({ providerKey: 'MOCK', modelKey: 'MOCK_AI' });
  }

  // Initialize AIs
  try {
    await orchestrator.initializeAIs(aiConfigs);
    console.log(`✅ Initialized ${aiConfigs.length} AI services`);
  } catch (error) {
    console.error('❌ Failed to initialize some AI services:', error);
  }

  return orchestrator;
}

// Initialize and start server
async function startServer() {
  try {
    // Initialize AI system
    const chatOrchestrator = await initializeAISystem();
    
    // Create socket controller
    global.socketController = new SocketController(io, chatOrchestrator);
    
    // Handle Socket.IO connections
    io.on('connection', (socket) => {
      console.log(`📱 New WebSocket connection: ${socket.id}`);
      global.socketController.handleConnection(socket);
    });

    // Debug Socket.IO events
    io.engine.on('connection_error', (err) => {
      console.error('❌ Socket.IO connection error:', err.message);
    });

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 AI Chat Server running on port ${PORT}`);
      console.log(`📱 Client URL: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
      console.log(`🔗 Socket.IO endpoint: http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📈 Stats API: http://localhost:${PORT}/api/stats`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        chatOrchestrator.cleanup();
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🛑 Received SIGINT, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Server closed');
        chatOrchestrator.cleanup();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();