/**
 * Common message formatting helpers for provider services
 */
import type { Message, OpenAIMessage, GeminiMessage, ChatFormattingOptions } from "../types/index.js";
/**
 * Map internal messages to OpenAI-compatible chat messages
 * @param messages - Array of message objects
 * @param options - Formatting options
 * @returns Array of OpenAI-compatible messages
 */
export declare const mapToOpenAIChat: (messages: Message[], { includeSystem }?: ChatFormattingOptions) => OpenAIMessage[];
/**
 * Inline any system messages into the first user message for providers
 * that don't accept the system role.
 * @param chat - Array of OpenAI-compatible messages
 * @returns Array with system messages inlined
 */
export declare const inlineSystemIntoFirstUser: (chat: OpenAIMessage[]) => OpenAIMessage[];
/**
 * Convert messages to Gemini chat history entries
 * @param messages - Array of message objects
 * @returns Array of Gemini-compatible messages
 */
export declare const toGeminiHistory: (messages: Message[]) => GeminiMessage[];
//# sourceMappingURL=aiFormatting.d.ts.map