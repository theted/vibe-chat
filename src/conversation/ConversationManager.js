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
import { statsTracker } from "@/services/StatsTracker.js";

// Helper builders extracted for readability
const summarizeParticipantTopics = (messages, participants) => {
  const topics = {};
  participants.forEach((p) => {
    const responses = messages
      .filter((msg) => msg.participantId === p.id)
      .map((msg) => msg.content);
    if (responses.length > 0) {
      topics[p.name] = responses
        .map((r) => r.substring(0, 150) + (r.length > 150 ? "..." : ""))
        .join("\n");
    }
  });
  return topics;
};

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
6. If the conversation gets repetitive, change the direction. Feel free to pivot or reference others by name to keep energy high.${
      recentMentions.length
        ? ` Recently active voices: ${recentMentions.join(", ")}.`
        : ""
    }

You're talking with: ${otherParticipants}

This is turn #${turnCount + 1} of ${config.maxTurns}${isLastTurn ? " (FINAL TURN)" : ""}`,
  };
};

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
    // Optionally summarize prior topics (reserved for future prompts)
    summarizeParticipantTopics(this.messages, this.participants);

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
    this.messages.push(enrichedMessage);

    const participant =
      enrichedMessage.participantId !== null &&
      enrichedMessage.participantId !== undefined
        ? this.participants[enrichedMessage.participantId]
        : null;

    const providerName =
      participant?.config?.provider?.name ||
      (enrichedMessage.participantId === null ? "User" : null);
    const modelId = participant?.config?.model?.id || null;

    statsTracker
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
