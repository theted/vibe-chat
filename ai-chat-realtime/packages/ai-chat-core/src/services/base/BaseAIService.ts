/**
 * Base AI Service
 *
 * This abstract class defines the interface for all AI service implementations.
 * Each AI provider should extend this class and implement its methods.
 */

import { enhanceSystemPromptWithPersona, getPersonaFromProvider } from '@/utils/personaUtils.js';
import {
  IAIServiceExtended,
  ServiceInitializationOptions,
  EnhancedServiceResponse,
  ServiceInitializationError,
  ServiceConfigurationError
} from '@/types/services.js';
import {
  AIServiceConfig,
  Message,
  ServiceResponse,
  ServiceInitOptions,
  Logger
} from '@/types/index.js';

export abstract class BaseAIService implements IAIServiceExtended {
  public readonly config: AIServiceConfig;
  public readonly name: string;
  protected logger?: Logger;
  protected initialized: boolean = false;
  protected lastHealthCheck?: number;

  constructor(config: AIServiceConfig, name: string = 'BaseAIService') {
    this.config = config;
    this.name = name;
    this.validateConfig(config);
  }

  /**
   * Validate service configuration on instantiation
   */
  private validateConfig(config: AIServiceConfig): void {
    if (!config?.provider?.name) {
      throw new ServiceConfigurationError(
        'Provider name is required',
        this.name,
        ['provider.name']
      );
    }

    if (!config?.model?.id) {
      throw new ServiceConfigurationError(
        'Model ID is required',
        this.name,
        ['model.id']
      );
    }

    if (!config?.provider?.apiKeyEnvVar) {
      throw new ServiceConfigurationError(
        'API key environment variable is required',
        this.name,
        ['provider.apiKeyEnvVar']
      );
    }
  }

  /**
   * Initialize the AI service
   */
  async initialize(options?: ServiceInitOptions): Promise<void> {
    try {
      await this.performInitialization(options);

      if (options?.validateOnInit !== false) {
        const isValid = await this.validateConfiguration();
        if (!isValid) {
          throw new ServiceInitializationError(
            'Service configuration validation failed',
            this.name
          );
        }
      }

      this.initialized = true;
    } catch (error) {
      const initError = new ServiceInitializationError(
        `Failed to initialize ${this.name}: ${error instanceof Error ? error.message : String(error)}`,
        this.name,
        { originalError: error }
      );
      throw initError;
    }
  }

  /**
   * Abstract method for service-specific initialization
   * Must be implemented by subclasses
   */
  protected abstract performInitialization(options?: ServiceInitOptions): Promise<void>;

  /**
   * Generate a response based on the conversation history
   */
  async generateResponse(
    messages: Message[],
    context?: Record<string, unknown>
  ): Promise<ServiceResponse> {
    if (!this.initialized) {
      throw new ServiceInitializationError(
        `Service ${this.name} is not initialized. Call initialize() first.`,
        this.name
      );
    }

    if (!this.isConfigured()) {
      throw new ServiceConfigurationError(
        `Service ${this.name} is not properly configured`,
        this.name
      );
    }

    try {
      const startTime = Date.now();
      const response = await this.performGenerateResponse(messages, context);
      const responseTime = Date.now() - startTime;

      return {
        ...response,
        responseTime,
        model: this.getModel()
      } as EnhancedServiceResponse;
    } catch (error) {
      this.logger?.error('Failed to generate response', {
        service: this.name,
        error: error instanceof Error ? error.message : String(error),
        messageCount: messages.length
      });
      throw error;
    }
  }

  /**
   * Abstract method for service-specific response generation
   * Must be implemented by subclasses
   */
  protected abstract performGenerateResponse(
    messages: Message[],
    context?: Record<string, unknown>
  ): Promise<ServiceResponse>;

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    try {
      // Check if API key is available
      const apiKey = process.env[this.config.provider.apiKeyEnvVar];
      if (!apiKey) {
        return false;
      }

      // Additional configuration checks can be added by subclasses
      return this.performConfigurationCheck();
    } catch {
      return false;
    }
  }

  /**
   * Service-specific configuration check
   * Can be overridden by subclasses for additional checks
   */
  protected performConfigurationCheck(): boolean {
    return true;
  }

  /**
   * Get the name of the AI service
   */
  getName(): string {
    return this.name;
  }

  /**
   * Get the model being used
   */
  getModel(): string {
    return this.config.model.id;
  }

  /**
   * Get the enhanced system prompt with persona traits
   */
  getEnhancedSystemPrompt(additionalContext?: string): string {
    const originalPrompt = this.config.model.systemPrompt || '';
    const persona = getPersonaFromProvider(this.config.provider);

    let enhancedPrompt = originalPrompt;

    if (persona) {
      enhancedPrompt = enhanceSystemPromptWithPersona(originalPrompt, persona);
    }

    if (additionalContext) {
      enhancedPrompt += `\n\nAdditional context: ${additionalContext}`;
    }

    return enhancedPrompt;
  }

  /**
   * Validate the service configuration
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      // Basic configuration checks
      if (!this.isConfigured()) {
        return false;
      }

      // Perform health check
      const healthCheckResult = await this.healthCheck();
      return healthCheckResult;
    } catch (error) {
      this.logger?.warn('Configuration validation failed', {
        service: this.name,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Perform a health check on the service
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Default implementation - can be overridden by subclasses
      const now = Date.now();

      // Cache health check results for 5 minutes
      if (this.lastHealthCheck && (now - this.lastHealthCheck) < 300000) {
        return true;
      }

      const healthCheckResult = await this.performHealthCheck();

      if (healthCheckResult) {
        this.lastHealthCheck = now;
      }

      return healthCheckResult;
    } catch (error) {
      this.logger?.error('Health check failed', {
        service: this.name,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * Service-specific health check
   * Can be overridden by subclasses for custom health checks
   */
  protected async performHealthCheck(): Promise<boolean> {
    // Default implementation just checks configuration
    return this.isConfigured();
  }

  /**
   * Shutdown the service and clean up resources
   */
  async shutdown(): Promise<void> {
    try {
      await this.performShutdown();
      this.initialized = false;
      this.lastHealthCheck = undefined;
    } catch (error) {
      this.logger?.error('Error during service shutdown', {
        service: this.name,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Service-specific shutdown logic
   * Can be overridden by subclasses for custom cleanup
   */
  protected async performShutdown(): Promise<void> {
    // Default implementation - no cleanup needed
  }

  /**
   * Reset the service connection
   */
  async resetConnection(): Promise<void> {
    try {
      await this.performConnectionReset();
      this.lastHealthCheck = undefined;
    } catch (error) {
      this.logger?.error('Error resetting connection', {
        service: this.name,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Service-specific connection reset logic
   * Can be overridden by subclasses for custom reset behavior
   */
  protected async performConnectionReset(): Promise<void> {
    // Default implementation - no reset needed
  }

  /**
   * Set a logger for the service
   */
  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  /**
   * Get service configuration (read-only)
   */
  getConfig(): Readonly<AIServiceConfig> {
    return { ...this.config };
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get service metadata
   */
  getMetadata(): Record<string, unknown> {
    return {
      name: this.name,
      provider: this.config.provider.name,
      model: this.config.model.id,
      initialized: this.initialized,
      lastHealthCheck: this.lastHealthCheck,
      configured: this.isConfigured()
    };
  }
}