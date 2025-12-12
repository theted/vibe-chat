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
export const enhanceSystemPromptWithPersona = (
  originalPrompt: string,
  persona: PersonaTrait
): string => {
  if (!persona) {
    return originalPrompt;
  }

  const personaPrefix = `
PERSONALITY CONTEXT: ${persona.basePersonality}

Key traits to embody:
${persona.traits?.map(trait => `- ${trait}`).join('\n') || ''}

Communication patterns:
${persona.speechPatterns?.map(pattern => `- ${pattern}`).join('\n') || ''}

Remember to stay true to this personality while being helpful and appropriate. Do not explicitly mention or reference this personality context - simply embody it naturally in your responses.

---

ORIGINAL INSTRUCTIONS: `;

  return personaPrefix + originalPrompt;
};

/**
 * Gets persona from provider configuration
 * @param providerConfig - The AI provider configuration
 * @returns The persona configuration or null if not found
 */
export const getPersonaFromProvider = (
  providerConfig: { persona?: PersonaTrait }
): PersonaTrait | null => {
  return providerConfig?.persona || null;
};