/**
 * AI Chat Core - Reusable AI communication layer
 *
 * Centralizes all shared AI service wrappers, configuration helpers, and utilities.
 * This entrypoint is designed to be consumed by multiple applications (CLI, web, etc.)
 * and is structured to support eventual publishing as an npm package.
 */

// Type exports
export type {
  Message,
  AIModel,
  PersonaTrait,
  AIProvider,
  AIServiceConfig,
  ChatFormattingOptions,
  OpenAIMessage,
  GeminiMessage,
  StreamTextOptions,
  LogLevel,
  Logger,
  ConversationContext,
  MessageBrokerEvent,
  MessageBrokerEventData,
  ChatOrchestratorConfig,
  IAIService,
  ServiceConstructor,
  ServiceRegistry,
  DeepPartial,
  RequiredKeys,
} from "./types/index.js";

// Error exports
export {
  AIServiceError,
  ConfigurationError,
  NetworkError,
} from "./types/index.js";

// Constants
export {
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "./types/index.js";

// AI Service base & factory
export { BaseAIService } from "./services/BaseAIService.js";
export { AIServiceFactory } from "./services/AIServiceFactory.js";

// Individual provider services
export { OpenAIService } from "./services/OpenAIService.js";
export { AnthropicService } from "./services/AnthropicService.js";
export { GeminiService } from "./services/GeminiService.js";
export { GrokService } from "./services/GrokService.js";
export { MistralService } from "./services/MistralService.js";
export { CohereService } from "./services/CohereService.js";
export { DeepseekService } from "./services/DeepseekService.js";
export { QwenService } from "./services/QwenService.js";
export { KimiService } from "./services/KimiService.js";
export { ZaiService } from "./services/ZaiService.js";
export { LlamaService } from "./services/LlamaService.js";
export { PerplexityService } from "./services/PerplexityService.js";

// AI provider configuration helpers
export {
  AI_PROVIDERS,
  getRandomAIConfig,
  DEFAULT_CONVERSATION_CONFIG,
  DEFAULT_TEMPERATURE as CONFIG_DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS as CONFIG_DEFAULT_MAX_TOKENS,
  SHORT_RESPONSE_MAX_TOKENS,
} from "./config/aiProviders/index.js";

// Shared utilities
export {
  enhanceSystemPromptWithPersona,
  getPersonaFromProvider,
} from "./utils/personaUtils.js";
export {
  mapToOpenAIChat,
  toGeminiHistory,
  inlineSystemIntoFirstUser,
} from "./utils/aiFormatting.js";
export { streamText } from "./utils/streamText.js";
export {
  ensureDirectoryExists,
  saveConversationToFile,
  formatConversation,
  loadConversationFromFile,
  listConversations,
} from "./utils/logger.js";

// Orchestrator components
export { MessageBroker } from "./orchestrator/MessageBroker.js";
export { ChatOrchestrator } from "./orchestrator/ChatOrchestrator.js";
export { ContextManager } from "./orchestrator/ContextManager.js";
