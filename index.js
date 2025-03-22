/**
 * AI Chat - Main Entry Point
 *
 * This file demonstrates how to use the conversation manager to start
 * a conversation between different AI services.
 */

import dotenv from "dotenv";
import { ConversationManager } from "./src/conversation/ConversationManager.js";
import { AIServiceFactory } from "./src/services/AIServiceFactory.js";
import {
  saveConversationToFile,
  formatConversation,
} from "./src/utils/logger.js";
import { AI_PROVIDERS } from "./src/config/aiProviders.js";

// Load environment variables
dotenv.config();

/**
 * Start a conversation between AI services
 * @param {string} initialMessage - The initial message to start the conversation
 * @param {number} maxTurns - The maximum number of turns in the conversation
 */
async function startAIConversation(initialMessage, maxTurns = 10) {
  console.log("Starting AI conversation...");

  // Create a conversation manager
  const conversationManager = new ConversationManager({
    maxTurns,
  });

  // Add participants
  try {
    // Add OpenAI GPT-4
    conversationManager.addParticipant({
      provider: AI_PROVIDERS.OPENAI,
      model: AI_PROVIDERS.OPENAI.models.GPT4,
    });

    // Add Anthropic Claude
    conversationManager.addParticipant({
      provider: AI_PROVIDERS.ANTHROPIC,
      model: AI_PROVIDERS.ANTHROPIC.models.CLAUDE3,
    });

    // Start the conversation
    await conversationManager.startConversation(initialMessage);

    // Get and display the conversation history
    const history = conversationManager.getConversationHistory();
    console.log("\nConversation Summary:");
    console.log(formatConversation(history));

    // Save the conversation to a file
    saveConversationToFile(history, initialMessage);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (error.message.includes("API key")) {
      console.log(
        "\nMake sure you've set up your .env file with the required API keys."
      );
      console.log("See .env.example for the required variables.");
    }
  }
}

/**
 * Main function
 */
async function main() {
  // Get the initial message from command line arguments or use a default
  const initialMessage =
    process.argv[2] ||
    "Discuss the future of artificial intelligence and its potential impact on society.";

  // Get the maximum number of turns from command line arguments or use a default
  const maxTurns = parseInt(process.argv[3], 10) || 10;

  await startAIConversation(initialMessage, maxTurns);
}

// Run the main function
main().catch(console.error);
