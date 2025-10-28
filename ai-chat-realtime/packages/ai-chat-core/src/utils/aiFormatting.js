/**
 * Common message formatting helpers for provider services
 */

/**
 * Map internal messages to OpenAI-compatible chat messages
 * @param {Array} messages
 * @param {Object} options
 * @param {boolean} options.includeSystem
 * @returns {Array<{role:string, content:string}>}
 */
export const mapToOpenAIChat = (messages, { includeSystem = true } = {}) =>
  messages
    .filter((m) => (includeSystem ? true : m.role !== "system"))
    .map((m) => ({ role: m.role, content: m.content }));

/**
 * Inline any system messages into the first user message for providers
 * that don't accept the system role.
 * @param {Array<{role:string, content:string}>} chat
 * @returns {Array<{role:string, content:string}>}
 */
export const inlineSystemIntoFirstUser = (chat) => {
  const systemText = chat
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n");
  const nonSystem = chat.filter((m) => m.role !== "system");
  if (!systemText) return nonSystem;

  const idx = nonSystem.findIndex((m) => m.role === "user");
  if (idx >= 0) {
    nonSystem[idx] = {
      role: "user",
      content: `${systemText}\n\n${nonSystem[idx].content}`,
    };
    return nonSystem;
  }
  return [{ role: "user", content: systemText }, ...nonSystem];
};

/**
 * Convert messages to Gemini chat history entries
 * @param {Array} messages
 * @returns {Array<{role:'user'|'model', parts:Array<{text:string}>}>}
 */
export const toGeminiHistory = (messages) =>
  messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

