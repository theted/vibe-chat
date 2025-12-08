/**
 * AI Service Factory
 *
 * This factory creates AI service instances based on the provider configuration.
 */
import type { AIServiceConfig, IAIService } from "../types/index.js";
export declare class AIServiceFactory {
    private static readonly serviceRegistry;
    /**
     * Create an AI service instance based on the provider configuration
     * @param config - Provider and model configuration
     * @returns An instance of the appropriate AI service
     * @throws Error if the provider is not supported
     */
    static createService(config: AIServiceConfig): IAIService;
    /**
     * Create an AI service instance for a specific provider and model
     * @param providerKey - Provider key (e.g., "OPENAI")
     * @param modelKey - Model key (e.g., "GPT4")
     * @returns An instance of the appropriate AI service
     * @throws Error if the provider or model is not found
     */
    static createServiceByName(providerKey: string, modelKey: string): IAIService;
    /**
     * Get list of available providers
     * @returns Array of available provider names
     */
    static getAvailableProviders(): string[];
    /**
     * Check if a provider is supported
     * @param providerName - Name of the provider to check
     * @returns True if the provider is supported
     */
    static isProviderSupported(providerName: string): boolean;
}
//# sourceMappingURL=AIServiceFactory.d.ts.map