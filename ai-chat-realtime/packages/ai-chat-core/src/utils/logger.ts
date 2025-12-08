/**
 * Logger Utility
 *
 * This utility provides functions for logging conversations to files.
 */

import fs from "fs";
import path from "path";
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
export const ensureDirectoryExists = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

/**
 * Save a conversation to a file
 * @param conversationHistory - The conversation history
 * @param topic - The conversation topic or initial message
 * @param metadata - Additional metadata to save
 * @returns The path to the saved file
 */
export const saveConversationToFile = (
  conversationHistory: Message[],
  topic: string,
  metadata: Record<string, any> = {}
): string => {
  const conversationsDir = path.join(process.cwd(), "conversations");
  ensureDirectoryExists(conversationsDir);

  // Create a filename based on the topic and timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const topicSlug = topic
    .slice(0, 30)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const filename = `${timestamp}-${topicSlug}.json`;
  const filePath = path.join(conversationsDir, filename);

  // Format the conversation for saving
  const conversationData: ConversationData = {
    topic,
    timestamp: new Date().toISOString(),
    messages: conversationHistory,
    metadata,
  };

  // Write the conversation to a file
  fs.writeFileSync(filePath, JSON.stringify(conversationData, null, 2));
  console.log(`Conversation saved to ${filePath}`);

  return filePath;
};

/**
 * Format a conversation for display
 * @param conversationHistory - The conversation history
 * @returns The formatted conversation
 */
export const formatConversation = (conversationHistory: Message[]): string =>
  conversationHistory
    .map((msg) => `[${msg.role}]: ${msg.content}`)
    .join("\n\n");

/**
 * Load a conversation from a file
 * @param filePath - The path to the conversation file
 * @returns The conversation data
 */
export const loadConversationFromFile = (filePath: string): ConversationData => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Conversation file not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(fileContent) as ConversationData;
};

/**
 * List all saved conversations
 * @returns An array of conversation file information
 */
export const listConversations = (): ConversationFileInfo[] => {
  const conversationsDir = path.join(process.cwd(), "conversations");

  if (!fs.existsSync(conversationsDir)) {
    return [];
  }

  const files = fs
    .readdirSync(conversationsDir)
    .filter((file) => file.endsWith(".json"));

  return files.map((file): ConversationFileInfo => {
    const filePath = path.join(conversationsDir, file);
    try {
      const data = loadConversationFromFile(filePath);
      return {
        filename: file,
        path: filePath,
        topic: data.topic,
        timestamp: data.timestamp,
        messageCount: data.messages.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return {
        filename: file,
        path: filePath,
        error: errorMessage,
      };
    }
  });
};