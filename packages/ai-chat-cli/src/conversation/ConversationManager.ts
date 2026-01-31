/**
 * Conversation Manager - Legacy CLI adapter
 *
 * @deprecated Use CLIOrchestratorAdapter instead, which properly integrates with
 * ChatOrchestrator from @ai-chat/core. This class is maintained for backward
 * compatibility and testing with dependency injection.
 *
 * This class provides a CLI-specific wrapper that handles:
 * - CLI I/O (streaming/printing)
 * - Synchronous conversation loop (round-robin turns)
 * - Dependency injection for testing
 *
 * For new code, prefer CLIOrchestratorAdapter which:
 * - Uses ChatOrchestrator's system prompt utilities
 * - Shares AI initialization patterns with the server
 * - Provides better integration with core orchestrator features
 */

import {
  AIServiceFactory,
  getRandomAIConfig,
  DEFAULT_CONVERSATION_CONFIG,
  streamText,
  ContextManager,
} from "@ai-chat/core";
import type {
  AIServiceConfig,
  IAIService,
  Message as CoreMessage,
} from "@ai-chat/core";
import { statsTracker } from "@/services/StatsTracker.js";
import { STREAM_WORD_DELAY_MS } from "@/config/constants.js";

// Define interfaces
type ConversationMessage = Omit<CoreMessage, "timestamp"> & {
  participantId?: number | null;
  timestamp?: string;
  authorName?: string;
};

interface Participant {
  id: number;
  service: IAIService;
  name: string;
  config: AIServiceConfig;
  aiId: string;
}

interface ConversationConfig {
  maxTurns: number;
  timeoutMs: number;
  logLevel?: string;
}

interface InternalResponder {
  name?: string;
  shouldHandle: (
    message: ConversationMessage,
    conversation?: ConversationMessage[],
  ) => boolean;
  handleMessage: (params: {
    message: ConversationMessage;
    conversation: ConversationMessage[];
  }) => Promise<{
    role?: CoreMessage["role"];
    content: string;
    authorName?: string;
  } | null>;
}

interface Dependencies {
  statsTracker?: typeof statsTracker;
  core?: {
    AIServiceFactory?: typeof AIServiceFactory;
    getRandomAIConfig?: typeof getRandomAIConfig;
    DEFAULT_CONVERSATION_CONFIG?: ConversationConfig;
    streamText?: typeof streamText;
    ContextManager?: typeof ContextManager;
  };
  internalResponders?: InternalResponder[];
}

// Helper builders extracted for readability
const summarizeParticipantTopics = (
  messages: ConversationMessage[],
  participants: Participant[],
): Record<string, string> => {
  const topics: Record<string, string> = {};
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

const buildSystemMessage = (
  cm: ConversationManager,
  participant: Participant,
): ConversationMessage => {
  const messages = cm.getMessages();
  const { config, turnCount, participants } = cm;
  const otherParticipants = participants
    .filter((p) => p.id !== participant.id)
    .map((p) => `- ${p.name}`)
    .join("\n");
  const lastMessage =
    messages.length > 0 ? messages[messages.length - 1] : null;
  const isResponseToOtherAI =
    lastMessage &&
    lastMessage.participantId !== null &&
    lastMessage.participantId !== participant.id;
  const isLastTurn = turnCount >= config.maxTurns - 2;
  const recentMentions = messages
    .slice(-5)
    .filter((msg) => msg.participantId !== null)
    .map((msg) => cm.participants[msg.participantId!]?.name || "")
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
      otherParticipants
        ? `(for example @${otherParticipants[0]?.split(" ")[0] || "participant"})`
        : ""
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

/**
 * CLI adapter for ChatOrchestrator.
 * Handles CLI-specific I/O while delegating core functionality to the orchestrator.
 */
export class ConversationManager {
  public config: ConversationConfig;
  public participants: Participant[] = [];
  public isActive: boolean = false;
  public turnCount: number = 0;
  public startTime: number | null = null;

  // Internal message storage (mirrors contextManager for CLI compatibility)
  private _messages: ConversationMessage[] = [];

  // Orchestrator components
  private contextManager: ContextManager;

  // Dependencies
  private statsTracker: typeof statsTracker;
  private aiServiceFactory: typeof AIServiceFactory;
  private getRandomAIConfig: typeof getRandomAIConfig;
  private streamText: typeof streamText;
  private internalResponders: InternalResponder[];

  constructor(
    config: Partial<ConversationConfig> = {},
    dependencies: Dependencies = {},
  ) {
    const {
      statsTracker: statsTrackerDependency = statsTracker,
      core = {},
      internalResponders = [],
    } = dependencies;

    const {
      AIServiceFactory: injectedFactory = AIServiceFactory,
      getRandomAIConfig: injectedRandomConfig = getRandomAIConfig,
      DEFAULT_CONVERSATION_CONFIG:
        injectedDefaultConfig = DEFAULT_CONVERSATION_CONFIG,
      streamText: injectedStreamText = streamText,
      ContextManager: InjectedContextManager = ContextManager,
    } = core;

    this.config = { ...injectedDefaultConfig, ...config };
    this.statsTracker = statsTrackerDependency;
    this.aiServiceFactory = injectedFactory;
    this.getRandomAIConfig = injectedRandomConfig;
    this.streamText = injectedStreamText;
    this.internalResponders = internalResponders;

    // Initialize context manager from core
    this.contextManager = new InjectedContextManager(100);
  }

  /**
   * Get messages (for backward compatibility)
   */
  get messages(): ConversationMessage[] {
    return this._messages;
  }

  /**
   * Set messages (for continue from file functionality)
   */
  set messages(value: ConversationMessage[]) {
    this._messages = value;
    // Sync to context manager
    this.contextManager.clear();
    value.forEach((msg) => {
      this.contextManager.addMessage({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp
          ? new Date(msg.timestamp).getTime()
          : Date.now(),
        sender: msg.authorName,
        senderType: msg.participantId === null ? "user" : "ai",
      } as CoreMessage);
    });
  }

  /**
   * Get messages array
   */
  getMessages(): ConversationMessage[] {
    return this._messages;
  }

  /**
   * Add an AI participant to the conversation
   * @param aiConfig - AI provider and model configuration
   * @returns The participant ID
   */
  addParticipant(aiConfig: AIServiceConfig): number {
    const service = this.aiServiceFactory.createService(aiConfig);
    const participantId = this.participants.length;
    const aiId = `cli_${participantId}_${service.getName()}_${service.getModel()}`;

    const participant: Participant = {
      id: participantId,
      service,
      name: `${service.getName()} (${service.getModel()})`,
      config: aiConfig,
      aiId,
    };

    this.participants.push(participant);
    return participant.id;
  }

  /**
   * Add a random AI participant to the conversation
   * @returns The participant ID
   */
  addRandomParticipant(): number {
    const aiConfig = this.getRandomAIConfig();
    return this.addParticipant(aiConfig);
  }

  /**
   * Start the conversation with an initial message
   * @param initialMessage - The initial message to start the conversation
   */
  async startConversation(initialMessage: string): Promise<void> {
    if (this.participants.length < 2) {
      throw new Error(
        "At least two participants are required for a conversation",
      );
    }

    this.isActive = true;
    this.startTime = Date.now();
    this.turnCount = 0;
    this._messages = [];
    this.contextManager.clear();

    // Add the initial message
    this.addMessage({
      role: "user",
      content: initialMessage,
      participantId: null, // External user
    });

    console.log("Starting conversation...");
    console.log(
      `Participants: ${this.participants.map((p) => p.name).join(", ")}`,
    );

    // Stream the initial message
    await this.streamText(initialMessage, "[User]: ", STREAM_WORD_DELAY_MS);
    await this.#handleInternalResponders(
      this._messages[this._messages.length - 1],
    );

    // Start the conversation loop immediately without delay
    await this.continueConversation();
  }

  /**
   * Continue the conversation for the specified number of turns
   */
  async continueConversation(): Promise<void> {
    while (this.isActive && this.turnCount < this.config.maxTurns) {
      // Check if the conversation has timed out
      if (
        this.startTime &&
        Date.now() - this.startTime > this.config.timeoutMs
      ) {
        console.log("Conversation timed out");
        this.isActive = false;
        break;
      }

      // Get the next participant (round-robin scheduling via orchestrator pattern)
      const participantIndex = this.turnCount % this.participants.length;
      const participant = this.participants[participantIndex];

      try {
        // Generate a response using the orchestrator's AI service
        const response = await this.generateResponse(participant);

        // Skip empty or whitespace-only responses
        if (!response || response.trim().length === 0) {
          console.log(
            `Participant ${participant.name} provided empty response, skipping turn`,
          );
          this.turnCount++;
          continue;
        }

        // Add the response to the conversation (both local and context manager)
        this.addMessage({
          role: "assistant",
          content: response,
          participantId: participant.id,
        });

        // Stream the response with a delay between words (CLI-specific I/O)
        await this.streamText(
          response,
          `[${participant.name}]: `,
          STREAM_WORD_DELAY_MS,
        );
        await this.#handleInternalResponders(
          this._messages[this._messages.length - 1],
        );

        // Increment the turn count
        this.turnCount++;

        // No delay between AI responses to keep the conversation flowing
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(`Error in conversation: ${errorMessage}`);
        this.isActive = false;
        break;
      }
    }

    if (this.turnCount >= this.config.maxTurns) {
      console.log(
        `Conversation reached maximum turns (${this.config.maxTurns})`,
      );
      this.isActive = false;
    }
  }

  /**
   * Generate a response from a participant using the orchestrator's AI service
   * @param participant - The participant to generate a response from
   * @returns The generated response
   */
  async generateResponse(participant: Participant): Promise<string> {
    // Optionally summarize prior topics (reserved for future prompts)
    summarizeParticipantTopics(this._messages, this.participants);

    const systemMessage = buildSystemMessage(this, participant);
    const formattedMessages = [
      systemMessage,
      ...this._messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    ];

    // Use the participant's AI service (from orchestrator pattern)
    const response =
      await participant.service.generateResponse(formattedMessages);
    return response.content;
  }

  /**
   * Add a message to the conversation
   * Updates both local storage and context manager
   * @param message - The message to add
   */
  addMessage(message: ConversationMessage): void {
    const enrichedMessage: ConversationMessage = {
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

    enrichedMessage.authorName = authorName || undefined;

    // Add to local messages
    this._messages.push(enrichedMessage);

    // Add to context manager (orchestrator component)
    this.contextManager.addMessage({
      role: enrichedMessage.role,
      content: enrichedMessage.content,
      timestamp: Date.now(),
      sender: authorName,
      senderType: enrichedMessage.participantId === null ? "user" : "ai",
      aiId: participant?.aiId,
    } as CoreMessage);

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
   * @returns The conversation history
   */
  getConversationHistory(): Array<{
    from: string;
    content: string;
    timestamp: string;
  }> {
    return this._messages.map((msg) => {
      const participant =
        msg.participantId !== null
          ? this.participants[msg.participantId!]
          : { name: "User" };

      return {
        from: msg.authorName || participant.name,
        content: msg.content,
        timestamp: msg.timestamp || "",
      };
    });
  }

  /**
   * Stop the conversation
   */
  stopConversation(): void {
    this.isActive = false;
    console.log("Conversation stopped");
  }

  /**
   * Get context manager (for advanced use cases)
   */
  getContextManager(): ContextManager {
    return this.contextManager;
  }

  async #handleInternalResponders(
    sourceMessage: ConversationMessage,
  ): Promise<void> {
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
        if (!responder.shouldHandle(sourceMessage, this._messages)) {
          continue;
        }

        const response = await responder.handleMessage({
          message: sourceMessage,
          conversation: this._messages,
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
          STREAM_WORD_DELAY_MS,
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        console.error(
          `Internal responder "${
            responder.name || "unknown"
          }" failed: ${errorMessage}`,
        );
      }
    }
  }
}
