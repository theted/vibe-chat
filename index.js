/**
 * AI Chat - Main Entry Point
 *
 * This file demonstrates how to use the conversation manager to start
 * a conversation between different AI services.
 */

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { ConversationManager } from "./src/conversation/ConversationManager.js";
import {
  AIServiceFactory,
  saveConversationToFile,
  formatConversation,
  loadConversationFromFile,
  AI_PROVIDERS,
  DEFAULT_MODELS,
  streamText,
} from "@ai-chat/core";
import {
  statsTracker,
} from "./src/services/StatsTracker.js";
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
    command: "start",
  };

  // If no arguments provided, display usage and return null
  if (args.length === 0) return (displayUsage(), null);

  // Handle "continue" command
  if (args[0].toLowerCase() === "continue") {
    if (args.length < 2) {
      console.error(
        'Usage: npm start continue <conversation-file> [provider[:MODEL] ...] [additionalTurns]'
      );
      return null;
    }

    result.command = "continue";
    result.conversationFile = args[1];
    result.participants = [];

    let endIndex = args.length;

    const lastArg = args[args.length - 1];
    if (lastArg && /^\d+$/.test(lastArg)) {
      result.additionalTurns = parseInt(lastArg, 10);
      endIndex -= 1;
    }

    for (let i = 2; i < endIndex; i++) {
      const participant = {};
      parseParticipant(args[i], participant);
      result.participants.push(participant);
    }

    if (!result.additionalTurns) {
      result.additionalTurns = 10;
    }

    return result;
  }

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

const findProviderKey = (providerConfig) => {
  const entry = Object.entries(AI_PROVIDERS).find(
    ([, provider]) => provider === providerConfig
  );
  return entry ? entry[0] : null;
};

const findModelKey = (providerConfig, modelConfig) => {
  const entry = Object.entries(providerConfig.models).find(
    ([, model]) => model === modelConfig
  );
  return entry ? entry[0] : null;
};

const buildParticipantMetadata = (participantConfig) => {
  const providerKey = findProviderKey(participantConfig.provider);
  const modelKey = findModelKey(
    participantConfig.provider,
    participantConfig.model
  );

  return {
    providerKey,
    providerAlias: providerKey ? providerKey.toLowerCase() : null,
    providerName: participantConfig.provider.name,
    modelKey,
    modelId: participantConfig.model.id,
  };
};

const participantsFromMetadata = (metadataParticipants = []) =>
  metadataParticipants
    .filter((meta) => meta.providerKey && meta.modelKey)
    .map((meta) => ({
      provider: (meta.providerAlias || meta.providerKey || "").toLowerCase(),
      model: meta.modelKey,
    }));

const resolveConversationPath = (filePath) => {
  if (!filePath) return null;
  const normalized = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  if (fs.existsSync(normalized)) {
    return normalized;
  }

  const conversationsDir = path.join(process.cwd(), "conversations");
  const fallback = path.join(conversationsDir, filePath);
  return fs.existsSync(fallback) ? fallback : normalized;
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
    const participantMeta = [];

    // Add all participants
    for (let i = 0; i < options.participants.length; i++) {
      const participantConfig = getProviderConfig(options.participants[i]);
      conversationManager.addParticipant(participantConfig);
      participantMeta.push(buildParticipantMetadata(participantConfig));
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
    saveConversationToFile(history, options.topic, {
      mode: "conversation",
      participants: participantMeta,
      maxTurns: options.maxTurns,
    });
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
 * Get responses from multiple AI services in a multi-turn group chat
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
    const responses = (options.existingResponses || []).map((entry) => ({
      ...entry,
    }));
    const hasInitialConversation = !!options.initialConversation;
    const conversation = hasInitialConversation
      ? [...options.initialConversation]
      : [
          {
            role: "user",
            content: options.topic,
          },
        ];

    if (hasInitialConversation) {
      console.log(
        `[Prompt]: ${options.topic} (continuing conversation with ${responses.length} prior responses)`
      );
    } else {
      await streamText(options.topic, "[Prompt]: ", 30);
      await statsTracker.recordMessage({
        role: "user",
        content: options.topic,
        provider: "User",
        model: null,
      });
    }

    // Create participant configs once
    const participantConfigs = options.participants.map((p) => ({
      ...getProviderConfig(p),
      participantData: p,
    }));
    const participantMeta = participantConfigs.map(({ provider, model }) =>
      buildParticipantMetadata({ provider, model })
    );
    const metadataBase = options.metadata || {};

    let lastParticipantIndex = -1;
    
    // Multi-turn conversation loop
    for (let turn = 0; turn < options.maxTurns; turn++) {
      // Select next participant (avoid consecutive responses from same model)
      let nextParticipantIndex;
      if (participantConfigs.length === 1) {
        nextParticipantIndex = 0;
      } else {
        do {
          nextParticipantIndex = Math.floor(Math.random() * participantConfigs.length);
        } while (nextParticipantIndex === lastParticipantIndex && participantConfigs.length > 1);
      }
      
      const config = participantConfigs[nextParticipantIndex];
      const service = AIServiceFactory.createService(config);
      const participantName = `${config.provider.name} (${config.model.id})`;

      try {
        // Create system message that evolves as the chat progresses
        const assistantTurns = conversation.filter(
          (m) => m.role === "assistant"
        ).length;
        const earlyPhase = assistantTurns < participantConfigs.length;
        const systemMessage = {
          role: "system",
          content: [
            `You are participating in a group chat about "${options.topic}".`,
            "Keep your response concise (1-3 sentences).",
            "Be conversational, reference recent remarks, and avoid repeating earlier wording.",
            earlyPhase
              ? "Because the chat is just beginning, greet the group once with personality and add a distinct insight."
              : "The chat is underway—do not re-introduce yourself. Build on the latest ideas, challenge them, or redirect to an interesting tangent, even if it moves beyond the original topic.",
            "If energy dips, spark momentum with a curious question or a surprising perspective.",
          ].join(" "),
        };

        // Build messages with system prompt and conversation history
        const messages = [systemMessage, ...conversation];

        // Generate response
        const response = await service.generateResponse(messages);

        // Truncate if too long (safety net)
        const truncatedResponse = response.length > 1000 ? response.substring(0, 1000) + "..." : response;

        // Stream the response
        await streamText(
          truncatedResponse,
          `[${participantName}]: `,
          30
        );

        // Add response to conversation history
        conversation.push({
          role: "assistant",
          content: truncatedResponse,
        });
        statsTracker
          .recordMessage({
            role: "assistant",
            content: truncatedResponse,
            provider: config.provider.name,
            model: config.model.id,
          })
          .catch(() => {});

        // Add to responses array for final summary
        responses.push({
          from: participantName,
          content: truncatedResponse,
          timestamp: new Date().toISOString(),
        });

        lastParticipantIndex = nextParticipantIndex;
        
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
    console.log("\nGroup Chat Summary:");
    console.log(formatConversation(responses));

    // Save responses to file
    saveConversationToFile(responses, options.topic, {
      ...metadataBase,
      mode: "singlePrompt",
      participants: participantMeta,
      maxTurns: options.maxTurns,
      turnsRecorded: responses.length,
    });
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

const continueConversationFromFile = async (options) => {
  try {
    const resolvedPath = resolveConversationPath(options.conversationFile);
    console.log(`Loading conversation from ${resolvedPath}`);

    const conversationData = loadConversationFromFile(resolvedPath);
    const metadata = conversationData.metadata || {};
    const additionalTurns = options.additionalTurns || 10;

    let participantInputs = options.participants;
    if (!participantInputs || participantInputs.length === 0) {
      participantInputs = participantsFromMetadata(metadata.participants);
    }

    if (!participantInputs || participantInputs.length === 0) {
      throw new Error(
        "Unable to determine participants. Specify overrides after the file path."
      );
    }

    let mode = metadata.mode;
    if (!mode) {
      mode = participantInputs.length > 2 ? "singlePrompt" : "conversation";
    }

    const topic = conversationData.topic || "Continued conversation";
    console.log(
      `Continuing in ${mode} mode with ${participantInputs.length} participant(s).`
    );

    if (mode === "conversation") {
      const conversationManager = new ConversationManager();
      const participantMeta = [];

      participantInputs.forEach((participantInput, index) => {
        const participantConfig = getProviderConfig(participantInput);
        conversationManager.addParticipant(participantConfig);
        participantMeta.push(buildParticipantMetadata(participantConfig));
        console.log(
          `Loaded participant ${index + 1}: ${participantConfig.provider.name} (${participantConfig.model.id})`
        );
      });

      // Rebuild conversation state
      const savedMessages = conversationData.messages || [];
      if (!savedMessages.length) {
        throw new Error("Conversation file contains no messages to continue.");
      }

      conversationManager.messages = [];
      let assistantTurns = 0;

      savedMessages.forEach((msg) => {
        const isUser =
          msg.from === "User" ||
          (msg.role && msg.role.toLowerCase() === "user") ||
          msg.participantId === null;
        let participantId = null;
        if (!isUser) {
          const matchedIndex = conversationManager.participants.findIndex(
            (p) => p.name === msg.from
          );
          if (matchedIndex !== -1) {
            participantId = matchedIndex;
          } else {
            console.warn(
              `Warning: could not match participant for "${msg.from}". Treating as user message.`
            );
          }
        }

        conversationManager.messages.push({
          role: isUser ? "user" : "assistant",
          content: msg.content,
          participantId,
          timestamp: msg.timestamp || new Date().toISOString(),
        });

        if (participantId !== null) assistantTurns += 1;
      });

      const existingUserMessages = conversationManager.messages.filter(
        (msg) => msg.participantId === null
      );
      if (existingUserMessages.length === 0) {
        conversationManager.messages.unshift({
          role: "user",
          content: topic,
          participantId: null,
          timestamp: new Date().toISOString(),
        });
      }

      conversationManager.turnCount = assistantTurns;
      conversationManager.config.maxTurns = assistantTurns + additionalTurns;
      conversationManager.startTime = Date.now();
      conversationManager.isActive = true;

      console.log(
        `Loaded ${assistantTurns} previous turns. Continuing for ${additionalTurns} more.`
      );

      await conversationManager.continueConversation();

      const history = conversationManager.getConversationHistory();
      console.log("\nUpdated Conversation Summary:");
      console.log(formatConversation(history));

      const metadataForSave = {
        ...metadata,
        mode: "conversation",
        participants: participantMeta,
        continuedFrom: resolvedPath,
        continuedAt: new Date().toISOString(),
        additionalTurns,
        totalTurns: history.filter((msg) => msg.from !== "User").length,
      };

      saveConversationToFile(history, topic, metadataForSave);
      return;
    }

    // Single prompt mode continuation
    const initialConversation = [
      {
        role: "user",
        content: topic,
      },
    ];
    const existingResponses = [];
    (conversationData.messages || []).forEach((msg) => {
      if (msg.from === "User") {
        // Already captured as initial prompt
        return;
      }

      existingResponses.push({ ...msg });
      initialConversation.push({
        role: "assistant",
        content: msg.content,
      });
    });

    const metadataForSave = {
      ...metadata,
      continuedFrom: resolvedPath,
      continuedAt: new Date().toISOString(),
      additionalTurns,
    };

    await getSinglePromptResponses({
      participants: participantInputs,
      topic,
      maxTurns: additionalTurns,
      initialConversation,
      existingResponses,
      metadata: metadataForSave,
    });
  } catch (error) {
    console.error(`Error continuing conversation: ${error.message}`);
  }
};

/**
 * Main function
 */
const main = async () => {
  const options = parseArgs();
  if (!options) return;
  if (options.command === "continue") {
    await continueConversationFromFile(options);
    return;
  }
  if (options.singlePromptMode) await getSinglePromptResponses(options);
  else await startAIConversation(options);
};

// Run the main function
main().catch(console.error);
