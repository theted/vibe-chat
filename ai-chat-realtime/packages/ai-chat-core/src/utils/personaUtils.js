/**
 * Persona Utilities
 * 
 * Helper functions for enhancing AI providers with personality traits
 */

/**
 * Enhances a system prompt with persona information
 * @param {string} originalPrompt - The original system prompt
 * @param {Object} persona - The persona configuration
 * @returns {string} Enhanced system prompt with persona traits
 */
export const enhanceSystemPromptWithPersona = (originalPrompt, persona) => {
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
 * @param {Object} providerConfig - The AI provider configuration
 * @returns {Object|null} The persona configuration or null if not found
 */
export const getPersonaFromProvider = (providerConfig) => {
  return providerConfig?.persona || null;
};