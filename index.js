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
import { AI_PROVIDERS, DEFAULT_MODELS } from "./src/config/aiProviders/index.js";
import { streamText } from "./src/utils/streamText.js";
import { DEFAULT_TOPIC, CLI_ALIASES, USAGE_LINES } from "./src/config/constants.js";

// Load environment variables
dotenv.config();

/**
 * Display usage instructions and supported models
 */
const displayUsage = () => {
  USAGE_LINES.forEach((l) => console.log(l));

  console.log("\nSupported providers and models:");
  Object.entries(AI_PROVIDERS).forEach(([providerKey, provider]) => {
    console.log(`\n${provider.name} (${providerKey.toLowerCase()}):`);
    Object.entries(provider.models).forEach(([modelKey, model]) => {
      console.log(`  - ${modelKey} (${model.id})`);
    });
  });

  console.log("\nEnvironment variables required in .env file:");
  Object.values(AI_PROVIDERS).forEach((provider) => {
    console.log(`  - ${provider.apiKeyEnvVar} (for ${provider.name})`);
  });
};

/**
 * Parse command line arguments
 * @returns {Object} Parsed arguments
 */
const parseArgs = () => {
  const args = process.argv.slice(2);
  const result = {
    participants: [],
    topic: DEFAULT_TOPIC,
    maxTurns: 10,
    singlePromptMode: false,
  };

  // If no arguments provided, display usage and return null
  if (args.length === 0) return (displayUsage(), null);

  // Check if we're running through npm start
  // In that case, arguments will be positional
  if (args.length > 0 && !args[0].startsWith("--")) {
    // Find the index of the first argument that doesn't look like a participant
    // Check if argument is a known model or provider name
    let topicIndex = args.findIndex((arg, index) => {
      // If it contains a colon, it's definitely a participant (provider:model)
      if (arg.includes(":")) return false;
      
      // Check if it's a known model name across all providers
      const upperArg = arg.toUpperCase();
      for (const providerConfig of Object.values(AI_PROVIDERS)) {
        if (providerConfig.models[upperArg]) return false;
      }
      
      // Check if it's a known provider name
      const lowerArg = arg.toLowerCase();
      const providerNames = Object.keys(AI_PROVIDERS).map(k => k.toLowerCase());
      const aliasNames = Object.keys(CLI_ALIASES);
      if (providerNames.includes(lowerArg) || aliasNames.includes(lowerArg)) return false;
      
      // If it's not a known model or provider, it's likely the start of the topic
      return true;
    });

    // If no topic found, assume all args are participants
    if (topicIndex === -1) {
      topicIndex = args.length;
      // Default topic if none provided
      result.topic = "Discuss this topic in an interesting way.";
    } else {
      // Check if the last argument is a number (maxTurns)
      const lastArg = args[args.length - 1];
      if (/^\d+$/.test(lastArg)) {
        result.maxTurns = parseInt(lastArg, 10);
        // Combine the rest of the arguments as the topic (excluding the last one)
        result.topic = args.slice(topicIndex, args.length - 1).join(" ");
      } else {
        // Combine the rest of the arguments as the topic
        result.topic = args.slice(topicIndex).join(" ");
      }
    }

    // Parse participants
    for (let i = 0; i < topicIndex; i++) {
      const participant = {};
      parseParticipant(args[i], participant);
      result.participants.push(participant);
    }

    // If we have more than 2 participants, assume single prompt mode
    if (result.participants.length > 2) {
      result.singlePromptMode = true;
    }
    // If we have exactly 2 participants, use conversation mode
    else if (result.participants.length === 2) {
      result.singlePromptMode = false;
    }
    // If we have 1 participant, use single prompt mode
    else if (result.participants.length === 1) {
      result.singlePromptMode = true;
    }
    // If we have 0 participants, use defaults
    else {
      result.participants = [
        { provider: "openai", model: null },
        { provider: "anthropic", model: null },
      ];
      result.singlePromptMode = false;
    }
  }
  // Otherwise, parse named arguments
  else {
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg === "--participant" && i + 1 < args.length) {
        const participant = {};
        parseParticipant(args[++i], participant);
        result.participants.push(participant);
      } else if (arg === "--topic" && i + 1 < args.length) {
        result.topic = args[++i];
      } else if (arg === "--maxTurns" && i + 1 < args.length) {
        result.maxTurns = parseInt(args[++i], 10) || 10;
      } else if (arg === "--singlePromptMode") {
        result.singlePromptMode = true;
      }
    }

    // If no participants specified, use defaults
    if (result.participants.length === 0) {
      result.participants = [
        { provider: "openai", model: null },
        { provider: "anthropic", model: null },
      ];
    }
  }

  return result;
};

/**
 * Parse participant string which may include model specification
 * @param {string} participantStr - Participant string (e.g., "mistral:MISTRAL_SMALL" or just "CLAUDE_SONNET_4_5")
 * @param {Object} participant - Participant object to update
 */
const parseParticipant = (participantStr, participant) => {
  const parts = participantStr.split(":");
  const rawProvider = parts[0].toLowerCase();
  
  // If no colon, check if this might be a model name instead of provider name
  if (parts.length === 1) {
    const modelName = participantStr.toUpperCase();
    
    // Search for this model across all providers
    for (const [providerKey, providerConfig] of Object.entries(AI_PROVIDERS)) {
      if (providerConfig.models[modelName]) {
        participant.provider = providerKey.toLowerCase();
        participant.model = modelName;
        return;
      }
    }
    
    // If not found as a model, treat as provider name
    participant.provider = CLI_ALIASES[rawProvider] || rawProvider;
    participant.model = null;
  } else {
    participant.provider = CLI_ALIASES[rawProvider] || rawProvider;
    participant.model = parts[1].toUpperCase();
  }
};

/**
 * Get provider and model configuration based on provider name and optional model name
 * @param {Object} participantConfig - Participant configuration with provider and model
 * @returns {Object} Provider and model configuration
 */
const getProviderConfig = (participantConfig) => {
  const providerName = participantConfig.provider;
  const modelName = participantConfig.model;

  let provider;

  switch (providerName.toLowerCase()) {
    case "cohere":
      provider = AI_PROVIDERS.COHERE;
      break;
    case "z":
    case "zai":
    case "z.ai":
      provider = AI_PROVIDERS.ZAI;
      break;
    case "gemini":
    case "gemeni": // common misspelling
    case "google":
      provider = AI_PROVIDERS.GEMINI;
      break;
    case "mistral":
      provider = AI_PROVIDERS.MISTRAL;
      break;
    case "openai":
      provider = AI_PROVIDERS.OPENAI;
      break;
    case "anthropic":
      provider = AI_PROVIDERS.ANTHROPIC;
      break;
    case "deepseek":
      provider = AI_PROVIDERS.DEEPSEEK;
      break;
    case "grok":
      provider = AI_PROVIDERS.GROK;
      break;
    case "qwen":
      provider = AI_PROVIDERS.QWEN;
      break;
    case "kimi":
    case "moonshot":
      provider = AI_PROVIDERS.KIMI;
      break;
    default:
      throw new Error(`Unsupported provider: ${providerName}`);
  }

  // If a specific model was requested, use it
  if (modelName) {
    if (!provider.models[modelName]) {
      throw new Error(
        `Model ${modelName} not found for provider ${provider.name}`
      );
    }
    return {
      provider,
      model: provider.models[modelName],
    };
  }

  // Otherwise use the default model for the provider
  return {
    provider,
    model: DEFAULT_MODELS[provider.name],
  };
};

/**
 * Start a conversation between AI services
 * @param {Object} options - Conversation options
 */
const startAIConversation = async (options) => {
  console.log("Starting AI conversation...");
  console.log(`Topic: "${options.topic}"`);

  const participantStrings = options.participants.map(
    (p) => `${p.provider}${p.model ? `:${p.model}` : ""}`
  );
  console.log(`Participants: ${participantStrings.join(", ")}`);
  console.log(`Max turns: ${options.maxTurns}`);

  // Create a conversation manager
  const conversationManager = new ConversationManager({
    maxTurns: options.maxTurns,
  });

  // Add participants
  try {
    // Add all participants
    for (let i = 0; i < options.participants.length; i++) {
      const participantConfig = getProviderConfig(options.participants[i]);
      conversationManager.addParticipant(participantConfig);
      console.log(
        `Added participant ${i + 1}: ${participantConfig.provider.name} (${
          participantConfig.model.id
        })`
      );
    }

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
};

/**
 * Get responses from multiple AI services for a single prompt
 * @param {Object} options - Options including participants and prompt
 */
const getSinglePromptResponses = async (options) => {
  console.log("Getting responses from multiple AI services...");
  console.log(`Prompt: "${options.topic}"`);

  const participantStrings = options.participants.map(
    (p) => `${p.provider}${p.model ? `:${p.model}` : ""}`
  );
  console.log(`Models: ${participantStrings.join(", ")}`);

  try {
    const responses = [];

    // Create a simple message array with just the user's prompt
    const messages = [
      {
        role: "user",
        content: options.topic,
      },
    ];

    // Get responses from each AI service
    for (const participant of options.participants) {
      const config = getProviderConfig(participant);
      const service = AIServiceFactory.createService(config);

      console.log(
        `\nGetting response from ${config.provider.name} (${config.model.id})...`
      );

      try {
        // Stream the prompt
        await streamText(options.topic, "[Prompt]: ", 30);

        // Generate response
        const response = await service.generateResponse(messages);

        // Stream the response
        await streamText(
          response,
          `[${config.provider.name} (${config.model.id})]: `,
          30
        );

        // Add to responses
        responses.push({
          from: `${config.provider.name} (${config.model.id})`,
          content: response,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`Error with ${config.provider.name}: ${error.message}`);
        responses.push({
          from: `${config.provider.name} (${config.model.id})`,
          content: `Error: ${error.message}`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Display summary
    console.log("\nResponses Summary:");
    console.log(formatConversation(responses));

    // Save responses to file
    saveConversationToFile(responses, options.topic);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (error.message.includes("API key")) {
      console.log(
        "\nMake sure you've set up your .env file with the required API keys."
      );
      console.log("See .env.example for the required variables.");
    }
  }
};

/**
 * Main function
 */
const main = async () => {
  const options = parseArgs();
  if (!options) return;
  if (options.singlePromptMode) await getSinglePromptResponses(options);
  else await startAIConversation(options);
};

// Run the main function
main().catch(console.error);
