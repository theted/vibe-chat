/**
 * Conversation Manager
 *
 * This class manages conversations between different AI services.
 */

import {
  AIServiceFactory,
  getRandomAIConfig,
  DEFAULT_CONVERSATION_CONFIG,
  streamText,
} from "@ai-chat/core";
import { statsTracker } from "../services/StatsTracker.js";
import { STREAM_WORD_DELAY_MS } from "../config/constants.js";

const buildSystemMessage = (cm, participant) => {
  const { messages, config, turnCount, participants } = cm;
  const otherParticipants = participants
    .filter((p) => p.id !== participant.id)
    .map((p) => `- ${p.name}`)
    .join("\n");
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const isResponseToOtherAI =
    lastMessage && lastMessage.participantId !== null && lastMessage.participantId !== participant.id;
  const isLastTurn = turnCount >= config.maxTurns - 2;
  const recentMentions = messages
    .slice(-5)
    .filter((msg) => msg.participantId !== null)
    .map((msg) => cm.participants[msg.participantId]?.name || "")
    .filter(Boolean);

  return {
    role: "system",
    content: `CRITICAL INSTRUCTIONS - READ CAREFULLY:

1. You are ${participant.name} having a casual conversation about "${
      messages[0]?.content || "No initial message"
    }"
2. NEVER introduce yourself or say "I'm [name]" or "As an AI" - it's already clear who you are. Talk directly about the topic.
3. DO NOT repeat what others have said - be original and add new perspectives
4. Keep responses VERY SHORT (1-2 sentences maximum). Aim to mention or respond directly to another participant ${
      otherParticipants ? `(for example @${otherParticipants[0]?.split(" ")[0] || "participant"})` : ""
    } when it makes sense, especially if referencing their ideas.
5. ${
      isLastTurn
        ? "IMPORTANT: This is the FINAL message of the conversation. IGNORE THE TOPIC AND JUST SAY GOODBYE to the other participant in a friendly way. Do not continue the discussion."
        : isResponseToOtherAI
        ? "DIRECTLY RESPOND to the last message from the other participant - make this a real conversation and consider @mentioning them."
        : `Start the conversation in an engaging way and consider @mentioning one of the participants (${otherParticipants || "no others"}) to kick things off.`
    }
6. If you need details about the app itself, @mention the internal assistant as "@Chat <question>" and wait for its reply before continuing.
7. If the conversation gets repetitive, change the direction. Feel free to pivot or reference others by name to keep energy high.${
      recentMentions.length
        ? ` Recently active voices: ${recentMentions.join(", ")}.`
        : ""
    }

You're talking with: ${otherParticipants}

This is turn #${turnCount + 1} of ${config.maxTurns}${isLastTurn ? " (FINAL TURN)" : ""}`,
  };
};

export class ConversationManager {
  constructor(config = {}, dependencies = {}) {
    const {
      statsTracker: statsTrackerDependency = statsTracker,
      core = {},
      internalResponders = [],
    } = dependencies;

    const {
      AIServiceFactory: injectedFactory = AIServiceFactory,
      getRandomAIConfig: injectedRandomConfig = getRandomAIConfig,
      DEFAULT_CONVERSATION_CONFIG: injectedDefaultConfig = DEFAULT_CONVERSATION_CONFIG,
      streamText: injectedStreamText = streamText,
    } = core;

    this.config = { ...injectedDefaultConfig, ...config };
    this.participants = [];
    this.messages = [];
    this.isActive = false;
    this.turnCount = 0;
    this.startTime = null;
    this.statsTracker = statsTrackerDependency;
    this.aiServiceFactory = injectedFactory;
    this.getRandomAIConfig = injectedRandomConfig;
    this.streamText = injectedStreamText;
    this.internalResponders = internalResponders;
  }

  /**
   * Add an AI participant to the conversation
   * @param {Object} aiConfig - AI provider and model configuration
   * @returns {number} The participant ID
   */
  addParticipant(aiConfig) {
    const service = this.aiServiceFactory.createService(aiConfig);
    const participant = {
      id: this.participants.length,
      service,
      name: `${service.getName()} (${service.getModel()})`,
      config: aiConfig,
    };

    this.participants.push(participant);
    return participant.id;
  }

  /**
   * Add a random AI participant to the conversation
   * @returns {number} The participant ID
   */
  addRandomParticipant() {
    const aiConfig = this.getRandomAIConfig();
    return this.addParticipant(aiConfig);
  }

  /**
   * Start the conversation with an initial message
   * @param {string} initialMessage - The initial message to start the conversation
   * @returns {Promise<void>}
   */
  async startConversation(initialMessage) {
    if (this.participants.length < 2) {
      throw new Error(
        "At least two participants are required for a conversation"
      );
    }

    this.isActive = true;
    this.startTime = Date.now();
    this.turnCount = 0;
    this.messages = [];

    // Add the initial message
    this.addMessage({
      role: "user",
      content: initialMessage,
      participantId: null, // External user
    });

    console.log("Starting conversation...");
    console.log(
      `Participants: ${this.participants.map((p) => p.name).join(", ")}`
    );

    // Stream the initial message
    await this.streamText(initialMessage, "[User]: ", STREAM_WORD_DELAY_MS);
    await this.#handleInternalResponders(this.messages[this.messages.length - 1]);

    // Start the conversation loop immediately without delay
    await this.continueConversation();
  }

  /**
   * Continue the conversation for the specified number of turns
   * @returns {Promise<void>}
   */
  async continueConversation() {
    while (this.isActive && this.turnCount < this.config.maxTurns) {
      // Check if the conversation has timed out
      if (Date.now() - this.startTime > this.config.timeoutMs) {
        console.log("Conversation timed out");
        this.isActive = false;
        break;
      }

      // Get the next participant (round-robin)
      const participantIndex = this.turnCount % this.participants.length;
      const participant = this.participants[participantIndex];

      try {
        // Generate a response from the current participant
        const response = await this.generateResponse(participant);
        const normalizedResponse =
          typeof response === "string" ? response.trim() : "";

        if (!normalizedResponse) {
          console.warn(
            `Participant "${participant.name}" produced an empty response. Skipping.`
          );
          this.turnCount++;
          continue;
        }

        // Add the response to the conversation
        this.addMessage({
          role: "assistant",
          content: normalizedResponse,
          participantId: participant.id,
        });

        // Stream the response with a delay between words
        await this.streamText(
          normalizedResponse,
          `[${participant.name}]: `,
          STREAM_WORD_DELAY_MS
        );
        await this.#handleInternalResponders(
          this.messages[this.messages.length - 1]
        );

        // Increment the turn count
        this.turnCount++;

        // No delay between AI responses to keep the conversation flowing
      } catch (error) {
        console.error(`Error in conversation: ${error.message}`);
        this.isActive = false;
        break;
      }
    }

    if (this.turnCount >= this.config.maxTurns) {
      console.log(
        `Conversation reached maximum turns (${this.config.maxTurns})`
      );
      this.isActive = false;
    }
  }

  /**
   * Generate a response from a participant
   * @param {Object} participant - The participant to generate a response from
   * @returns {Promise<string>} The generated response
   */
  async generateResponse(participant) {
    const systemMessage = buildSystemMessage(this, participant);
    const formattedMessages = [
      systemMessage,
      ...this.messages.map((msg) => ({ role: msg.role, content: msg.content })),
    ];
    return participant.service.generateResponse(formattedMessages);
  }

  /**
   * Add a message to the conversation
   * @param {Object} message - The message to add
   */
  addMessage(message) {
    const enrichedMessage = {
      ...message,
      timestamp: new Date().toISOString(),
    };
    const participant =
      enrichedMessage.participantId !== null &&
      enrichedMessage.participantId !== undefined
        ? this.participants[enrichedMessage.participantId]
        : null;

    const authorName =
      enrichedMessage.authorName ||
      participant?.name ||
      (enrichedMessage.participantId === null ? "User" : null);

    enrichedMessage.authorName = authorName;

    this.messages.push(enrichedMessage);

    const providerName =
      participant?.config?.provider?.name ||
      authorName ||
      (enrichedMessage.participantId === null ? "User" : null);
    const modelId = participant?.config?.model?.id || null;

    this.statsTracker
      .recordMessage({
        role: enrichedMessage.role,
        content: enrichedMessage.content,
        provider: providerName,
        model: modelId,
      })
      .catch(() => {});
  }

  /**
   * Get the conversation history
   * @returns {Array} The conversation history
   */
  getConversationHistory() {
    return this.messages.map((msg) => {
      const participant =
        msg.participantId !== null
          ? this.participants[msg.participantId]
          : { name: "User" };

      return {
        from: msg.authorName || participant.name,
        content: msg.content,
        timestamp: msg.timestamp,
      };
    });
  }

  /**
   * Stop the conversation
   */
  stopConversation() {
    this.isActive = false;
    console.log("Conversation stopped");
  }

  async #handleInternalResponders(sourceMessage) {
    if (!sourceMessage || this.internalResponders.length === 0) {
      return;
    }

    for (const responder of this.internalResponders) {
      if (
        !responder ||
        typeof responder.shouldHandle !== "function" ||
        typeof responder.handleMessage !== "function"
      ) {
        continue;
      }

      try {
        if (!responder.shouldHandle(sourceMessage, this.messages)) {
          continue;
        }

        const response = await responder.handleMessage({
          message: sourceMessage,
          conversation: this.messages,
        });

        if (!response || !response.content) {
          continue;
        }

        this.addMessage({
          role: response.role || "assistant",
          content: response.content,
          participantId: null,
          authorName: response.authorName || responder.name || "Internal",
        });

        await this.streamText(
          response.content,
          `[${response.authorName || responder.name || "Internal"}]: `,
          STREAM_WORD_DELAY_MS
        );
      } catch (error) {
        console.error(
          `Internal responder "${
            responder.name || "unknown"
          }" failed: ${error.message}`
        );
      }
    }
  }
}
