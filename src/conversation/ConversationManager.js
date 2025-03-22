/**
 * Conversation Manager
 *
 * This class manages conversations between different AI services.
 */

import { AIServiceFactory } from "../services/AIServiceFactory.js";
import {
  getRandomAIConfig,
  DEFAULT_CONVERSATION_CONFIG,
} from "../config/aiProviders.js";

export class ConversationManager {
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONVERSATION_CONFIG, ...config };
    this.participants = [];
    this.messages = [];
    this.isActive = false;
    this.turnCount = 0;
    this.startTime = null;
  }

  /**
   * Add an AI participant to the conversation
   * @param {Object} aiConfig - AI provider and model configuration
   * @returns {number} The participant ID
   */
  addParticipant(aiConfig) {
    const service = AIServiceFactory.createService(aiConfig);
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
    const aiConfig = getRandomAIConfig();
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

    console.log(
      `Starting conversation with initial message: "${initialMessage}"`
    );
    console.log(
      `Participants: ${this.participants.map((p) => p.name).join(", ")}`
    );

    // Start the conversation loop
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

        // Add the response to the conversation
        this.addMessage({
          role: "assistant",
          content: response,
          participantId: participant.id,
        });

        console.log(`[${participant.name}]: ${response}`);

        this.turnCount++;
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
    // Format messages for the AI service
    const formattedMessages = this.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Generate a response
    return participant.service.generateResponse(formattedMessages);
  }

  /**
   * Add a message to the conversation
   * @param {Object} message - The message to add
   */
  addMessage(message) {
    this.messages.push({
      ...message,
      timestamp: new Date().toISOString(),
    });
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
        from: participant.name,
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
}
