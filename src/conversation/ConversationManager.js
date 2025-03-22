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
import { streamText } from "../utils/streamText.js";

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

    console.log("Starting conversation...");
    console.log(
      `Participants: ${this.participants.map((p) => p.name).join(", ")}`
    );

    // Stream the initial message
    await streamText(initialMessage, "[User]: ", 30);

    // Add a delay before the first AI response (1-2 seconds)
    const delayMs = Math.floor(Math.random() * 1000) + 1000; // 1-2 seconds
    await new Promise((resolve) => setTimeout(resolve, delayMs));

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

        // Stream the response with a delay between words
        await streamText(response, `[${participant.name}]: `, 30);

        // Increment the turn count
        this.turnCount++;

        // Add a delay between AI responses (1-2 seconds)
        if (this.turnCount < this.config.maxTurns) {
          const delayMs = Math.floor(Math.random() * 1000) + 1000; // 1-2 seconds
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
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
    // Get more messages to provide better context
    const recentMessages = this.messages.slice(-6);

    // Get a summary of what each participant has already discussed
    const participantTopics = {};
    this.participants.forEach((p) => {
      const responses = this.messages
        .filter((msg) => msg.participantId === p.id)
        .map((msg) => msg.content);

      if (responses.length > 0) {
        participantTopics[p.name] = responses
          .map((r) => r.substring(0, 150) + (r.length > 150 ? "..." : ""))
          .join("\n");
      }
    });

    // Create a more detailed system message with participant introductions
    const otherParticipants = this.participants
      .filter((p) => p.id !== participant.id)
      .map((p) => `- ${p.name}`)
      .join("\n");

    // Create a simplified system message with clear instructions
    const systemMessage = {
      role: "system",
      content: `CRITICAL INSTRUCTIONS - READ CAREFULLY:

1. You are ${participant.name} having a casual conversation about "${
        this.messages[0]?.content || "No initial message"
      }"
2. NEVER introduce yourself or say "I'm [name]" or "As an AI" - just talk about the topic directly
3. DO NOT repeat what others have said - be original and add new perspectives
4. Keep responses concise (2-3 paragraphs)
5. If the conversation gets repetitive, change the direction

You're talking with: ${otherParticipants}

This is turn #${this.turnCount + 1} of the conversation.`,
    };

    // Format messages for the AI service
    const formattedMessages = [
      systemMessage,
      ...this.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

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
