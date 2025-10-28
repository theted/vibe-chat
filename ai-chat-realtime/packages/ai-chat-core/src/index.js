/**
 * AI Chat Core - Reusable AI communication layer
 *
 * Centralizes all shared AI service wrappers, configuration helpers, and utilities.
 * This entrypoint is designed to be consumed by multiple applications (CLI, web, etc.)
 * and is structured to support eventual publishing as an npm package.
 */

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
  DEFAULT_MODELS,
  getRandomAIConfig,
  DEFAULT_CONVERSATION_CONFIG,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
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
export { ChatOrchestrator } from "./orchestrator/ChatOrchestrator.js";
export { MessageBroker } from "./orchestrator/MessageBroker.js";
export { ContextManager } from "./orchestrator/ContextManager.js";
