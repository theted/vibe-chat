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
 * Parse command line arguments
 * @returns {Object} Parsed arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {
    participant1: "openai",
    participant2: "anthropic",
    topic:
      "Discuss the future of artificial intelligence and its potential impact on society.",
    maxTurns: 10,
  };

  // Check if we're running through npm start
  // In that case, arguments will be positional
  if (args.length > 0 && !args[0].startsWith("--")) {
    // If we have at least 3 arguments, assume they are participant1, participant2, and topic
    if (args.length >= 3) {
      result.participant1 = args[0].toLowerCase();
      result.participant2 = args[1].toLowerCase();
      // Combine the rest of the arguments as the topic
      result.topic = args.slice(2).join(" ");
    }
    // If we have 2 arguments, assume they are participant1 and participant2
    else if (args.length === 2) {
      result.participant1 = args[0].toLowerCase();
      result.participant2 = args[1].toLowerCase();
    }
    // If we have 1 argument, assume it's the topic
    else if (args.length === 1) {
      result.topic = args[0];
    }
  }
  // Otherwise, parse named arguments
  else {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === "--participant1" && i + 1 < args.length) {
        result.participant1 = args[++i].toLowerCase();
      } else if (arg === "--participant2" && i + 1 < args.length) {
        result.participant2 = args[++i].toLowerCase();
      } else if (arg === "--topic" && i + 1 < args.length) {
        result.topic = args[++i];
      } else if (arg === "--maxTurns" && i + 1 < args.length) {
        result.maxTurns = parseInt(args[++i], 10) || 10;
      }
    }
  }

  return result;
}

/**
 * Get provider and model configuration based on provider name
 * @param {string} providerName - Provider name (e.g., "openai", "anthropic", "mistral", "gemini", "deepseek")
 * @returns {Object} Provider and model configuration
 */
function getProviderConfig(providerName) {
  switch (providerName.toLowerCase()) {
    case "gemini":
      return {
        provider: AI_PROVIDERS.GEMINI,
        model: AI_PROVIDERS.GEMINI.models.GEMINI_FLASH,
      };
    case "mistral":
      return {
        provider: AI_PROVIDERS.MISTRAL,
        model: AI_PROVIDERS.MISTRAL.models.MISTRAL_LARGE,
      };
    case "openai":
      return {
        provider: AI_PROVIDERS.OPENAI,
        model: AI_PROVIDERS.OPENAI.models.GPT4,
      };
    case "anthropic":
      return {
        provider: AI_PROVIDERS.ANTHROPIC,
        model: AI_PROVIDERS.ANTHROPIC.models.CLAUDE3,
      };
    case "deepseek":
      return {
        provider: AI_PROVIDERS.DEEPSEEK,
        model: AI_PROVIDERS.DEEPSEEK.models.DEEPSEEK_CHAT,
      };
    case "grok":
      return {
        provider: AI_PROVIDERS.GROK,
        model: AI_PROVIDERS.GROK.models.GROK_1,
      };
    default:
      throw new Error(`Unsupported provider: ${providerName}`);
  }
}

/**
 * Start a conversation between AI services
 * @param {Object} options - Conversation options
 */
async function startAIConversation(options) {
  console.log("Starting AI conversation...");
  console.log(`Topic: "${options.topic}"`);
  console.log(`Participants: ${options.participant1}, ${options.participant2}`);
  console.log(`Max turns: ${options.maxTurns}`);

  // Create a conversation manager
  const conversationManager = new ConversationManager({
    maxTurns: options.maxTurns,
  });

  // Add participants
  try {
    // Add first participant
    const participant1Config = getProviderConfig(options.participant1);
    conversationManager.addParticipant(participant1Config);
    console.log(`Added participant 1: ${participant1Config.provider.name}`);

    // Add second participant
    const participant2Config = getProviderConfig(options.participant2);
    conversationManager.addParticipant(participant2Config);
    console.log(`Added participant 2: ${participant2Config.provider.name}`);

    // Start the conversation
    await conversationManager.startConversation(options.topic);

    // Get and display the conversation history
    const history = conversationManager.getConversationHistory();
    console.log("\nConversation Summary:");
    console.log(formatConversation(history));

    // Save the conversation to a file
    saveConversationToFile(history, options.topic);
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
  const options = parseArgs();
  await startAIConversation(options);
}

// Run the main function
main().catch(console.error);
