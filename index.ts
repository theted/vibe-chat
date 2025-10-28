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
import { statsTracker } from "./src/services/StatsTracker.js";
import { DEFAULT_TOPIC, CLI_ALIASES, USAGE_LINES } from "./src/config/constants.js";

type ProviderModel = { id: string; name: string };

type ProviderConfig = {
  name: string;
  apiKeyEnvVar?: string;
  models: Record<string, ProviderModel>;
};

type ProviderRegistry = Record<string, ProviderConfig>;

type ProviderConfigEntry = {
  provider: ProviderConfig;
  model: ProviderModel;
};

type ConversationLogEntry = {
  role: string;
  content: string;
};

type ConversationSummary = Array<{
  from: string;
  content: string;
  timestamp: string;
}>;

type ProviderParticipantsInput = Array<{
  provider: string;
  model: string | null;
}>;

interface ParsedParticipant {
  provider: string;
  model: string | null;
}

type CliCommand = "start" | "continue";

interface CliOptions {
  participants: ProviderParticipantsInput;
  topic: string;
  maxTurns: number;
  singlePromptMode: boolean;
  command: CliCommand;
  conversationFile?: string;
  additionalTurns?: number;
  metadata?: ConversationMetadata;
  existingResponses?: ConversationSummary;
  initialConversation?: ConversationLogEntry[];
}

interface ContinueOptions extends CliOptions {
  conversationFile: string;
  additionalTurns: number;
}

interface ParticipantMetadata {
  providerKey: string | null;
  providerAlias: string | null;
  providerName: string;
  modelKey: string | null;
  modelId: string;
}

type ConversationMetadata = Record<string, unknown> & {
  mode?: string;
  participants?: ParticipantMetadata[];
  continuedFrom?: string;
  continuedAt?: string;
  additionalTurns?: number;
  totalTurns?: number;
};

type ParsedConversation = {
  topic: string;
  messages: Array<{
    from: string;
    content: string;
    timestamp?: string;
    participantId?: number | null;
  }>;
  metadata?: ConversationMetadata;
};

const PROVIDERS = AI_PROVIDERS as ProviderRegistry;
const DEFAULT_MODEL_MAP = DEFAULT_MODELS as Record<string, ProviderModel>;

interface AIServiceInstance {
  generateResponse(messages: ConversationLogEntry[]): Promise<string>;
  getName(): string;
  getModel(): string;
}

interface AIServiceFactoryType {
  createService(config: ProviderConfigEntry): AIServiceInstance;
}

const ServiceFactory = AIServiceFactory as unknown as AIServiceFactoryType;

// Load environment variables
dotenv.config();

/**
 * Display usage instructions and supported models
 */
const displayUsage = (): void => {
  USAGE_LINES.forEach((line) => console.log(line));

  console.log("\nSupported providers and models:");
  Object.entries(PROVIDERS).forEach(([providerKey, provider]) => {
    console.log(`\n${provider.name} (${providerKey.toLowerCase()}):`);
    Object.entries(provider.models).forEach(([modelKey, model]) => {
      console.log(`  - ${modelKey} (${model.id})`);
    });
  });

  console.log("\nEnvironment variables required in .env file:");
  Object.values(PROVIDERS).forEach((provider) => {
    if (provider.apiKeyEnvVar) {
      console.log(`  - ${provider.apiKeyEnvVar} (for ${provider.name})`);
    }
  });
};

const parseParticipant = (participantStr: string): ParsedParticipant => {
  const parts = participantStr.split(":");
  const rawProvider = parts[0].toLowerCase();

  if (parts.length === 1) {
    const modelName = participantStr.toUpperCase();
    for (const [providerKey, providerConfig] of Object.entries(PROVIDERS)) {
      if (providerConfig.models[modelName]) {
        return { provider: providerKey.toLowerCase(), model: modelName };
      }
    }

    return {
      provider: CLI_ALIASES[rawProvider as keyof typeof CLI_ALIASES] || rawProvider,
      model: null,
    };
  }

  return {
    provider: CLI_ALIASES[rawProvider as keyof typeof CLI_ALIASES] || rawProvider,
    model: parts[1].toUpperCase(),
  };
};

const parseArgs = (): CliOptions | ContinueOptions | null => {
  const args = process.argv.slice(2);
  const baseResult: CliOptions = {
    participants: [],
    topic: DEFAULT_TOPIC,
    maxTurns: 10,
    singlePromptMode: false,
    command: "start",
  };

  if (args.length === 0) {
    displayUsage();
    return null;
  }

  if (args[0].toLowerCase() === "continue") {
    if (args.length < 2) {
      console.error(
        'Usage: npm start continue <conversation-file> [provider[:MODEL] ...] [additionalTurns]'
      );
      return null;
    }

    const participants: ProviderParticipantsInput = [];
    let endIndex = args.length;
    let additionalTurns = 10;

    const lastArg = args[args.length - 1];
    if (lastArg && /^\d+$/.test(lastArg)) {
      additionalTurns = parseInt(lastArg, 10);
      endIndex -= 1;
    }

    for (let i = 2; i < endIndex; i += 1) {
      participants.push(parseParticipant(args[i]));
    }

    return {
      ...baseResult,
      command: "continue",
      conversationFile: args[1],
      additionalTurns,
      participants,
    } satisfies ContinueOptions;
  }

  if (args.length > 0 && !args[0].startsWith("--")) {
    const providerNames = Object.keys(PROVIDERS).map((key) => key.toLowerCase());
    const aliasNames = Object.keys(CLI_ALIASES);
    const topicIndex = args.findIndex((arg) => {
      if (arg.includes(":")) return false;

      const upperArg = arg.toUpperCase();
      if (
        Object.values(PROVIDERS).some((provider) => provider.models[upperArg])
      ) {
        return false;
      }

      const lowerArg = arg.toLowerCase();
      if (providerNames.includes(lowerArg) || aliasNames.includes(lowerArg)) {
        return false;
      }

      return true;
    });

    const positionalOptions: CliOptions = { ...baseResult, participants: [] };

    const effectiveTopicIndex = topicIndex === -1 ? args.length : topicIndex;

    if (topicIndex === -1) {
      positionalOptions.topic = "Discuss this topic in an interesting way.";
    } else {
      const lastArg = args[args.length - 1];
      if (/^\d+$/.test(lastArg)) {
        positionalOptions.maxTurns = parseInt(lastArg, 10);
        positionalOptions.topic = args
          .slice(effectiveTopicIndex, args.length - 1)
          .join(" ");
      } else {
        positionalOptions.topic = args.slice(effectiveTopicIndex).join(" ");
      }
    }

    for (let i = 0; i < effectiveTopicIndex; i += 1) {
      positionalOptions.participants.push(parseParticipant(args[i]));
    }

    if (positionalOptions.participants.length > 2) {
      positionalOptions.singlePromptMode = true;
    } else if (positionalOptions.participants.length === 1) {
      positionalOptions.singlePromptMode = true;
    } else if (positionalOptions.participants.length === 0) {
      positionalOptions.participants = [
        { provider: "openai", model: null },
        { provider: "anthropic", model: null },
      ];
      positionalOptions.singlePromptMode = false;
    }

    return positionalOptions;
  }

  const namedOptions: CliOptions = { ...baseResult, participants: [] };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--participant" && i + 1 < args.length) {
      namedOptions.participants.push(parseParticipant(args[i + 1]));
      i += 1;
    } else if (arg === "--topic" && i + 1 < args.length) {
      namedOptions.topic = args[i + 1];
      i += 1;
    } else if (arg === "--maxTurns" && i + 1 < args.length) {
      const value = Number(args[i + 1]);
      namedOptions.maxTurns = Number.isFinite(value) ? value : namedOptions.maxTurns;
      i += 1;
    } else if (arg === "--singlePromptMode") {
      namedOptions.singlePromptMode = true;
    }
  }

  if (namedOptions.participants.length === 0) {
    namedOptions.participants = [
      { provider: "openai", model: null },
      { provider: "anthropic", model: null },
    ];
  }

  return namedOptions;
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

const findProviderKey = (providerConfig: ProviderConfig): string | null => {
  const entry = Object.entries(PROVIDERS).find(
    ([, provider]) => provider === providerConfig,
  );
  return entry ? entry[0] : null;
};

const findModelKey = (
  providerConfig: ProviderConfig,
  modelConfig: ProviderModel,
): string | null => {
  const entry = Object.entries(providerConfig.models).find(
    ([, model]) => model.id === modelConfig.id,
  );
  return entry ? entry[0] : null;
};

const buildParticipantMetadata = (participantConfig: ProviderConfigEntry): ParticipantMetadata => {
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

const participantsFromMetadata = (
  metadataParticipants: ParticipantMetadata[] = [],
): ProviderParticipantsInput =>
  metadataParticipants
    .filter((meta) => Boolean(meta.providerKey && meta.modelKey))
    .map((meta) => ({
      provider: (meta.providerAlias || meta.providerKey || "").toLowerCase(),
      model: meta.modelKey,
    }));

const resolveConversationPath = (filePath?: string | null): string | null => {
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
const getProviderConfig = (
  participantConfig: ParsedParticipant,
): ProviderConfigEntry => {
  const providerName = participantConfig.provider;
  const modelName = participantConfig.model;

  let provider;

  switch (providerName.toLowerCase()) {
    case "cohere":
      provider = PROVIDERS.COHERE;
      break;
    case "z":
    case "zai":
    case "z.ai":
      provider = PROVIDERS.ZAI;
      break;
    case "gemini":
    case "gemeni": // common misspelling
    case "google":
      provider = PROVIDERS.GEMINI;
      break;
    case "mistral":
      provider = PROVIDERS.MISTRAL;
      break;
    case "openai":
      provider = PROVIDERS.OPENAI;
      break;
    case "anthropic":
      provider = PROVIDERS.ANTHROPIC;
      break;
    case "deepseek":
      provider = PROVIDERS.DEEPSEEK;
      break;
    case "grok":
      provider = PROVIDERS.GROK;
      break;
    case "qwen":
      provider = PROVIDERS.QWEN;
      break;
    case "kimi":
    case "moonshot":
      provider = PROVIDERS.KIMI;
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
    model: DEFAULT_MODEL_MAP[provider.name],
  };
};

/**
 * Start a conversation between AI services
 * @param {Object} options - Conversation options
 */
const startAIConversation = async (options: CliOptions): Promise<void> => {
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
      conversationManager.addParticipant(
        participantConfig as unknown as ProviderConfigEntry,
      );
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
const getSinglePromptResponses = async (options: CliOptions): Promise<void> => {
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
      const service = ServiceFactory.createService(config);
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

const continueConversationFromFile = async (
  options: ContinueOptions,
): Promise<void> => {
  try {
    const resolvedPath = resolveConversationPath(options.conversationFile);
    if (!resolvedPath) {
      throw new Error("Conversation file path could not be resolved");
    }
    console.log(`Loading conversation from ${resolvedPath}`);

    const conversationData = loadConversationFromFile(resolvedPath) as ParsedConversation;
    const metadata = (conversationData.metadata || {}) as ConversationMetadata;
    const additionalTurns = options.additionalTurns || 10;

    let participantInputs = options.participants;
    if (!participantInputs || participantInputs.length === 0) {
      participantInputs = participantsFromMetadata(
        metadata.participants as ParticipantMetadata[] | undefined,
      );
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
      const participantMeta: ParticipantMetadata[] = [];

      participantInputs.forEach((participantInput, index) => {
        const participantConfig = getProviderConfig(participantInput);
        conversationManager.addParticipant(
          participantConfig as unknown as ProviderConfigEntry,
        );
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
const main = async (): Promise<void> => {
  const options = parseArgs();
  if (!options) return;
  if (options.command === "continue") {
    await continueConversationFromFile(options as ContinueOptions);
    return;
  }
  if (options.singlePromptMode) await getSinglePromptResponses(options);
  else await startAIConversation(options);
};

// Run the main function
main().catch(console.error);
