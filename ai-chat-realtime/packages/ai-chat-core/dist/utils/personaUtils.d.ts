/**
 * Persona Utilities
 *
 * Helper functions for enhancing AI providers with personality traits
 */
import type { PersonaTrait } from "../types/index.js";
/**
 * Enhances a system prompt with persona information
 * @param originalPrompt - The original system prompt
 * @param persona - The persona configuration
 * @returns Enhanced system prompt with persona traits
 */
export declare const enhanceSystemPromptWithPersona: (originalPrompt: string, persona: PersonaTrait) => string;
/**
 * Gets persona from provider configuration
 * @param providerConfig - The AI provider configuration
 * @returns The persona configuration or null if not found
 */
export declare const getPersonaFromProvider: (providerConfig: {
    persona?: PersonaTrait;
}) => PersonaTrait | null;
//# sourceMappingURL=personaUtils.d.ts.map