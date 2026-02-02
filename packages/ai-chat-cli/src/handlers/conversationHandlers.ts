/**
 * Conversation Handlers
 * Main logic for starting and continuing AI conversations
 */

import {
  AIServiceFactory,
  saveConversationToFile,
  formatConversation,
  loadConversationFromFile,
  streamText,
  type Message,
} from "@ai-chat/core";
import { statsTracker } from "../services/StatsTracker.js";
import {
  STREAM_WORD_DELAY_MS,
  MAX_STREAMED_RESPONSE_LENGTH,
  DEFAULT_ADDITIONAL_TURNS,
} from "../config/constants.js";
import type {
  ConversationOptions,
  ContinueOptions,
  ConversationHistoryEntry,
  ParticipantMetadata,
  toMessages,
} from "../types/cli.js";
import {
  getProviderConfig,
  buildParticipantMetadata,
  participantsFromMetadata,
  resolveConversationPath,
} from "../utils/participantUtils.js";
import type { CLIOrchestratorAdapter } from "../conversation/CLIOrchestratorAdapter.js";

type ToMessagesFn = typeof toMessages;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Start a conversation between AI services
 */
export const startAIConversation = async (
  options: ConversationOptions,
  conversationManager: CLIOrchestratorAdapter,
  toMessagesFn: ToMessagesFn,
): Promise<void> => {
  console.log("Starting AI conversation...");
  console.log(`Topic: "${options.topic}"`);

  const participantStrings = options.participants.map(
    (p) => `${p.provider}${p.model ? `:${p.model}` : ""}`,
  );
  console.log(`Participants: ${participantStrings.join(", ")}`);
  console.log(`Max turns: ${options.maxTurns}`);

  try {
    const participantMeta: ParticipantMetadata[] = [];

    // Add all participants
    for (let i = 0; i < options.participants.length; i++) {
      const participantConfig = getProviderConfig(options.participants[i]);
      conversationManager.addParticipant(participantConfig);
      participantMeta.push(buildParticipantMetadata(participantConfig));
      console.log(
        `Added participant ${i + 1}: ${participantConfig.provider.name} (${
          participantConfig.model.id
        })`,
      );
    }

    // Start the conversation
    await conversationManager.startConversation(options.topic);

    // Get and display the conversation history
    const history = conversationManager.getConversationHistory();
    console.log("\nConversation Summary:");
    console.log(formatConversation(toMessagesFn(history)));

    // Save the conversation to a file
    saveConversationToFile(toMessagesFn(history), options.topic, {
      mode: "conversation",
      participants: participantMeta,
      maxTurns: options.maxTurns,
    });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error(`Error: ${errorMessage}`);
    if (errorMessage.includes("API key")) {
      console.log(
        "\nMake sure you've set up your .env file with the required API keys.",
      );
      console.log("See .env.example for the required variables.");
    }
  }
};

/**
 * Get responses from multiple AI services in a multi-turn group chat
 */
export const getSinglePromptResponses = async (
  options: ConversationOptions,
  toMessagesFn: ToMessagesFn,
): Promise<void> => {
  console.log("Getting responses from multiple AI services...");
  console.log(`Prompt: "${options.topic}"`);

  const participantStrings = options.participants.map(
    (p) => `${p.provider}${p.model ? `:${p.model}` : ""}`,
  );
  console.log(`Models: ${participantStrings.join(", ")}`);

  try {
    const responses: ConversationHistoryEntry[] = (
      options.existingResponses || []
    ).map((entry) => ({
      ...entry,
    }));
    const hasInitialConversation = !!options.initialConversation;
    const conversation: Message[] = hasInitialConversation
      ? [...(options.initialConversation || [])]
      : [{ role: "user" as const, content: options.topic }];

    if (hasInitialConversation) {
      console.log(
        `[Prompt]: ${options.topic} (continuing conversation with ${responses.length} prior responses)`,
      );
    } else {
      await streamText(options.topic, "[Prompt]: ", STREAM_WORD_DELAY_MS);
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
    const participantMeta: ParticipantMetadata[] = participantConfigs.map(
      ({ provider, model }) => buildParticipantMetadata({ provider, model }),
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
          nextParticipantIndex = Math.floor(
            Math.random() * participantConfigs.length,
          );
        } while (
          nextParticipantIndex === lastParticipantIndex &&
          participantConfigs.length > 1
        );
      }

      const config = participantConfigs[nextParticipantIndex];
      const service = AIServiceFactory.createService(config);
      const participantName = `${config.provider.name} (${config.model.id})`;

      try {
        // Create system message that evolves as the chat progresses
        const assistantTurns = conversation.filter(
          (m) => m.role === "assistant",
        ).length;
        const earlyPhase = assistantTurns < participantConfigs.length;
        const systemMessage: Message = {
          role: "system" as const,
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
        const messages: Message[] = [systemMessage, ...conversation];

        // Generate response
        const serviceResponse = await service.generateResponse(messages);
        const responseText = serviceResponse.content;

        // Truncate if too long (safety net)
        const truncatedResponse =
          responseText.length > MAX_STREAMED_RESPONSE_LENGTH
            ? responseText.substring(0, MAX_STREAMED_RESPONSE_LENGTH) + "..."
            : responseText;

        // Stream the response
        await streamText(
          truncatedResponse,
          `[${participantName}]: `,
          STREAM_WORD_DELAY_MS,
        );

        // Add response to conversation history
        conversation.push({
          role: "assistant" as const,
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
        const errorMessage = getErrorMessage(error);
        console.error(`Error with ${config.provider.name}: ${errorMessage}`);
        responses.push({
          from: `${config.provider.name} (${config.model.id})`,
          content: `Error: ${errorMessage}`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Display summary
    console.log("\nGroup Chat Summary:");
    console.log(formatConversation(toMessagesFn(responses)));

    // Save responses to file
    saveConversationToFile(toMessagesFn(responses), options.topic, {
      ...metadataBase,
      mode: "singlePrompt",
      participants: participantMeta,
      maxTurns: options.maxTurns,
      turnsRecorded: responses.length,
    });
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    console.error(`Error: ${errorMessage}`);
    if (errorMessage.includes("API key")) {
      console.log(
        "\nMake sure you've set up your .env file with the required API keys.",
      );
      console.log("See .env.example for the required variables.");
    }
  }
};

/**
 * Continue a conversation from a saved file
 */
export const continueConversationFromFile = async (
  options: ContinueOptions,
  createOrchestratorAdapter: () => Promise<CLIOrchestratorAdapter>,
  toMessagesFn: ToMessagesFn,
): Promise<void> => {
  try {
    const resolvedPath = resolveConversationPath(options.conversationFile);
    console.log(`Loading conversation from ${resolvedPath}`);

    const conversationData = loadConversationFromFile(resolvedPath);
    const metadata = conversationData.metadata || {};
    const additionalTurns = options.additionalTurns || DEFAULT_ADDITIONAL_TURNS;

    let participantInputs = options.participants;
    if (!participantInputs || participantInputs.length === 0) {
      participantInputs = participantsFromMetadata(metadata.participants);
    }

    if (!participantInputs || participantInputs.length === 0) {
      throw new Error(
        "Unable to determine participants. Specify overrides after the file path.",
      );
    }

    let mode = metadata.mode;
    if (!mode) {
      mode = participantInputs.length > 2 ? "singlePrompt" : "conversation";
    }

    const topic = conversationData.topic || "Continued conversation";
    console.log(
      `Continuing in ${mode} mode with ${participantInputs.length} participant(s).`,
    );

    if (mode === "conversation") {
      await continueConversationMode(
        conversationData,
        participantInputs,
        topic,
        additionalTurns,
        resolvedPath,
        metadata,
        createOrchestratorAdapter,
        toMessagesFn,
      );
      return;
    }

    // Single prompt mode continuation
    await continueSinglePromptMode(
      conversationData,
      participantInputs,
      topic,
      additionalTurns,
      resolvedPath,
      metadata,
      toMessagesFn,
    );
  } catch (error) {
    console.error(`Error continuing conversation: ${getErrorMessage(error)}`);
  }
};

// Helper for conversation mode continuation
const continueConversationMode = async (
  conversationData: ReturnType<typeof loadConversationFromFile>,
  participantInputs: ReturnType<typeof participantsFromMetadata>,
  topic: string,
  additionalTurns: number,
  resolvedPath: string | null,
  metadata: Record<string, unknown>,
  createOrchestratorAdapter: () => Promise<CLIOrchestratorAdapter>,
  toMessagesFn: ToMessagesFn,
): Promise<void> => {
  const conversationManager = await createOrchestratorAdapter();
  const participantMeta: ParticipantMetadata[] = [];

  participantInputs.forEach((participantInput, index) => {
    const participantConfig = getProviderConfig(participantInput);
    conversationManager.addParticipant(participantConfig);
    participantMeta.push(buildParticipantMetadata(participantConfig));
    console.log(
      `Loaded participant ${index + 1}: ${participantConfig.provider.name} (${participantConfig.model.id})`,
    );
  });

  // Rebuild conversation state
  type LoadedMessage = Message & {
    from?: string;
    participantId?: number | null;
  };
  const savedMessages = (conversationData.messages || []) as LoadedMessage[];
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
        (p) => p.name === msg.from,
      );
      if (matchedIndex !== -1) {
        participantId = matchedIndex;
      } else {
        console.warn(
          `Warning: could not match participant for "${msg.from}". Treating as user message.`,
        );
      }
    }

    conversationManager.messages.push({
      role: isUser ? "user" : "assistant",
      content: msg.content,
      participantId,
      timestamp:
        typeof msg.timestamp === "number"
          ? new Date(msg.timestamp).toISOString()
          : msg.timestamp || new Date().toISOString(),
    });

    if (participantId !== null) assistantTurns += 1;
  });

  const existingUserMessages = conversationManager.messages.filter(
    (msg) => msg.participantId === null,
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
    `Loaded ${assistantTurns} previous turns. Continuing for ${additionalTurns} more.`,
  );

  await conversationManager.continueConversation();

  const history = conversationManager.getConversationHistory();
  console.log("\nUpdated Conversation Summary:");
  console.log(formatConversation(toMessagesFn(history)));

  const metadataForSave = {
    ...metadata,
    mode: "conversation",
    participants: participantMeta,
    continuedFrom: resolvedPath,
    continuedAt: new Date().toISOString(),
    additionalTurns,
    totalTurns: history.filter((msg) => msg.from !== "User").length,
  };

  saveConversationToFile(toMessagesFn(history), topic, metadataForSave);
};

// Helper for single prompt mode continuation
const continueSinglePromptMode = async (
  conversationData: ReturnType<typeof loadConversationFromFile>,
  participantInputs: ReturnType<typeof participantsFromMetadata>,
  topic: string,
  additionalTurns: number,
  resolvedPath: string | null,
  metadata: Record<string, unknown>,
  toMessagesFn: ToMessagesFn,
): Promise<void> => {
  type LoadedMessage = Message & { from?: string };
  const loadedMessages = (conversationData.messages || []) as LoadedMessage[];
  const initialConversation: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }> = [{ role: "user" as const, content: topic }];
  const existingResponses: ConversationHistoryEntry[] = [];

  loadedMessages.forEach((msg) => {
    if (msg.from === "User" || msg.role === "user") {
      return;
    }

    existingResponses.push({
      from: msg.from || "Assistant",
      content: msg.content,
      timestamp: String(msg.timestamp || new Date().toISOString()),
      role: msg.role,
    });
    initialConversation.push({
      role: "assistant" as const,
      content: msg.content,
    });
  });

  const metadataForSave = {
    ...metadata,
    continuedFrom: resolvedPath,
    continuedAt: new Date().toISOString(),
    additionalTurns,
  };

  await getSinglePromptResponses(
    {
      participants: participantInputs,
      topic,
      maxTurns: additionalTurns,
      initialConversation,
      existingResponses,
      metadata: metadataForSave,
    },
    toMessagesFn,
  );
};
