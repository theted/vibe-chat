/**
 * Logger Utility
 *
 * This utility provides functions for logging conversations to files.
 */
import type { Message } from "../types/index.js";
interface ConversationData {
    topic: string;
    timestamp: string;
    messages: Message[];
    metadata: Record<string, any>;
}
interface ConversationFileInfo {
    filename: string;
    path: string;
    topic?: string;
    timestamp?: string;
    messageCount?: number;
    error?: string;
}
/**
 * Ensure the conversations directory exists
 * @param dirPath - The directory path
 */
export declare const ensureDirectoryExists: (dirPath: string) => void;
/**
 * Save a conversation to a file
 * @param conversationHistory - The conversation history
 * @param topic - The conversation topic or initial message
 * @param metadata - Additional metadata to save
 * @returns The path to the saved file
 */
export declare const saveConversationToFile: (conversationHistory: Message[], topic: string, metadata?: Record<string, any>) => string;
/**
 * Format a conversation for display
 * @param conversationHistory - The conversation history
 * @returns The formatted conversation
 */
export declare const formatConversation: (conversationHistory: Message[]) => string;
/**
 * Load a conversation from a file
 * @param filePath - The path to the conversation file
 * @returns The conversation data
 */
export declare const loadConversationFromFile: (filePath: string) => ConversationData;
/**
 * List all saved conversations
 * @returns An array of conversation file information
 */
export declare const listConversations: () => ConversationFileInfo[];
export {};
//# sourceMappingURL=logger.d.ts.map