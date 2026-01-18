/**
 * Base AI Service
 *
 * This abstract class defines the interface for all AI service implementations.
 * Each AI provider should extend this class and implement its methods.
 */

import { enhanceSystemPromptWithPersona, getPersonaFromProvider } from "../utils/personaUtils.js";
import type { AIServiceConfig, Message, IAIService, ServiceResponse, ServiceInitOptions } from "../types/index.js";

export abstract class BaseAIService implements IAIService {
  public readonly config: AIServiceConfig;
  public name: string;
  protected initialized: boolean = false;

  constructor(config: AIServiceConfig) {
    if (this.constructor === BaseAIService) {
      throw new Error(
        "BaseAIService is an abstract class and cannot be instantiated directly"
      );
    }

    this.config = config;
    this.name = "BaseAIService";
  }

  /**
   * Initialize the AI service
   */
  abstract initialize(options?: ServiceInitOptions): Promise<void>;

  /**
   * Generate a response based on the conversation history
   * @param messages - Array of message objects with role and content
   * @param context - Optional context for the request
   * @returns The generated response
   */
  abstract generateResponse(messages: Message[], context?: Record<string, unknown>): Promise<ServiceResponse>;

  /**
   * Check if the service is properly configured
   * @returns True if the service is properly configured
   */
  abstract isConfigured(): boolean;

  /**
   * Validate configuration
   * @returns True if configuration is valid
   */
  abstract validateConfiguration(): Promise<boolean>;

  /**
   * Get the name of the AI service
   * @returns The name of the AI service
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get the model being used
   * @returns The model ID
   */
  getModel(): string {
    return this.config.model.id;
  }

  /**
   * Get the enhanced system prompt with persona traits
   * @param additionalContext - Optional additional context to include
   * @returns The system prompt enhanced with persona information
   */
  getEnhancedSystemPrompt(additionalContext?: string): string {
    const originalPrompt = this.config.model.systemPrompt;
    const persona = getPersonaFromProvider(this.config.provider as any);

    let enhancedPrompt = originalPrompt || "";

    if (persona) {
      enhancedPrompt = enhanceSystemPromptWithPersona(enhancedPrompt, persona);
    }

    if (additionalContext) {
      enhancedPrompt += `\n\n${additionalContext}`;
    }

    return enhancedPrompt;
  }

  /**
   * Get the service configuration
   * @returns The service configuration
   */
  getConfig(): AIServiceConfig {
    return this.config;
  }

  /**
   * Check if the service is initialized
   * @returns True if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    this.initialized = false;
    // Base implementation - override in subclasses if needed
  }
}