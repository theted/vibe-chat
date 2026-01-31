/**
 * Common message formatting helpers for provider services
 */

import type {
  Message,
  OpenAIMessage,
  GeminiMessage,
  ChatFormattingOptions,
} from "@/types/index.js";

/**
 * Map internal messages to OpenAI-compatible chat messages
 * @param messages - Array of message objects
 * @param options - Formatting options
 * @returns Array of OpenAI-compatible messages
 */
export const mapToOpenAIChat = (
  messages: Message[],
  { includeSystem = true }: ChatFormattingOptions = {},
): OpenAIMessage[] =>
  messages
    .filter((m) => (includeSystem ? true : m.role !== "system"))
    .map((m) => ({ role: m.role, content: m.content }));

/**
 * Inline any system messages into the first user message for providers
 * that don't accept the system role.
 * @param chat - Array of OpenAI-compatible messages
 * @returns Array with system messages inlined
 */
export const inlineSystemIntoFirstUser = (
  chat: OpenAIMessage[],
): OpenAIMessage[] => {
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
 * @param messages - Array of message objects
 * @returns Array of Gemini-compatible messages
 */
export const toGeminiHistory = (messages: Message[]): GeminiMessage[] =>
  messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
