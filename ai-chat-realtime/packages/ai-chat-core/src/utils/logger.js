/**
 * Logger Utility
 *
 * This utility provides functions for logging conversations to files.
 */

import fs from "fs";
import path from "path";

/**
 * Ensure the conversations directory exists
 * @param {string} dirPath - The directory path
 */
export const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
};

/**
 * Save a conversation to a file
 * @param {Array} conversationHistory - The conversation history
 * @param {string} topic - The conversation topic or initial message
 * @returns {string} The path to the saved file
 */
export const saveConversationToFile = (
  conversationHistory,
  topic,
  metadata = {}
) => {
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
  const conversationData = {
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
 * @param {Array} conversationHistory - The conversation history
 * @returns {string} The formatted conversation
 */
export const formatConversation = (conversationHistory) =>
  conversationHistory
    .map((msg) => `[${msg.from}]: ${msg.content}`)
    .join("\n\n");

/**
 * Load a conversation from a file
 * @param {string} filePath - The path to the conversation file
 * @returns {Object} The conversation data
 */
export const loadConversationFromFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Conversation file not found: ${filePath}`);
  }

  const fileContent = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(fileContent);
};

/**
 * List all saved conversations
 * @returns {Array} An array of conversation file information
 */
export const listConversations = () => {
  const conversationsDir = path.join(process.cwd(), "conversations");

  if (!fs.existsSync(conversationsDir)) {
    return [];
  }

  const files = fs
    .readdirSync(conversationsDir)
    .filter((file) => file.endsWith(".json"));

  return files.map((file) => {
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
      return {
        filename: file,
        path: filePath,
        error: error.message,
      };
    }
  });
};
