/**
 * CLI Orchestrator Adapter
 *
 * Thin wrapper around ChatOrchestrator for synchronous CLI usage.
 * Handles:
 * - Synchronous round-robin turn-taking (vs event-driven async)
 * - CLI-specific streaming output
 * - Stats tracking
 *
 * Delegates to ChatOrchestrator for:
 * - AI service initialization
 * - Context management
 * - System prompt building
 */

import {
  ChatOrchestrator,
  ContextManager,
  AIServiceFactory,
  streamText,
  AI_PROVIDERS,
  createEnhancedSystemPrompt,
} from "@ai-chat/core";
import type { AIServiceConfig, IAIService, Message, AIProvider, AIModel } from "@ai-chat/core";
import { statsTracker } from "../services/StatsTracker.js";
import { STREAM_WORD_DELAY_MS, MAX_STREAMED_RESPONSE_LENGTH } from "../config/constants.js";

// Types
interface CLIParticipant {
  id: number;
  aiId: string;
  service: IAIService;
  name: string;
  displayName: string;
  alias: string;
  config: {
    providerKey: string;
    modelKey: string;
    provider: AIProvider;
    model: AIModel;
  };
}

interface ConversationConfig {
  maxTurns: number;
  timeoutMs: number;
}

interface InternalResponder {
  name?: string;
  shouldHandle: (
    message: ConversationMessage,
    conversation?: ConversationMessage[]
  ) => boolean;
  handleMessage: (params: {
    message: ConversationMessage;
    conversation: ConversationMessage[];
  }) => Promise<{ role?: Message["role"]; content: string; authorName?: string } | null>;
}

interface ConversationMessage {
  role: Message["role"];
  content: string;
  participantId?: number | null;
  timestamp?: string;
  authorName?: string;
}

interface AdapterOptions {
  maxTurns?: number;
  timeoutMs?: number;
  internalResponders?: InternalResponder[];
}

// Constants
const DEFAULT_MAX_TURNS = 10;
const DEFAULT_TIMEOUT_MS = 300000; // 5 minutes

/**
 * CLI adapter for ChatOrchestrator.
 * Provides synchronous conversation control for command-line usage.
 */
export class CLIOrchestratorAdapter {
  private orchestrator: ChatOrchestrator;
  public participants: CLIParticipant[] = [];
  private _messages: ConversationMessage[] = [];
  private internalResponders: InternalResponder[];

  public config: ConversationConfig;
  public isActive = false;
  public turnCount = 0;
  public startTime: number | null = null;

  constructor(options: AdapterOptions = {}) {
    this.config = {
      maxTurns: options.maxTurns ?? DEFAULT_MAX_TURNS,
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    };
    this.internalResponders = options.internalResponders ?? [];

    // Create orchestrator with minimal delays for CLI (synchronous usage)
    this.orchestrator = new ChatOrchestrator({
      maxMessages: 100,
      maxAIMessages: this.config.maxTurns,
      // Set delays to 0 for synchronous CLI operation
      minUserResponseDelay: 0,
      maxUserResponseDelay: 0,
      minBackgroundDelay: 0,
      maxBackgroundDelay: 0,
      minDelayBetweenAI: 0,
      maxDelayBetweenAI: 0,
    });

    // Stop background conversation timer (not needed for CLI)
    this.orchestrator.cleanup();
    // Re-initialize context manager (cleanup clears it)
    (this.orchestrator as unknown as { contextManager: ContextManager }).contextManager =
      new ContextManager(100);
  }

  /**
   * Get messages array for backward compatibility
   */
  get messages(): ConversationMessage[] {
    return this._messages;
  }

  /**
   * Set messages (for continue from file)
   */
  set messages(value: ConversationMessage[]) {
    this._messages = value;
    // Sync to orchestrator's context manager
    this.orchestrator.contextManager.clear();
    value.forEach((msg) => {
      this.orchestrator.contextManager.addMessage({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now(),
        sender: msg.authorName,
        senderType: msg.participantId === null ? "user" : "ai",
      } as Parameters<ContextManager["addMessage"]>[0]);
    });
  }

  /**
   * Add an AI participant using orchestrator-compatible config
   * Accepts configs with full AIProvider (from AI_PROVIDERS) that includes models
   */
  addParticipant(aiConfig: { provider: AIProvider; model: AIModel }): number {
    const providerKey = this.findProviderKey(aiConfig.provider);
    const modelKey = this.findModelKey(aiConfig.provider, aiConfig.model);

    const service = AIServiceFactory.createService(aiConfig);
    const participantId = this.participants.length;
    const displayName = `${service.getName()} (${service.getModel()})`;
    const alias = displayName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const aiId = `cli_${participantId}_${providerKey}_${modelKey}`;

    const participant: CLIParticipant = {
      id: participantId,
      aiId,
      service,
      name: displayName,
      displayName,
      alias,
      config: {
        providerKey,
        modelKey,
        provider: aiConfig.provider,
        model: aiConfig.model,
      },
    };

    this.participants.push(participant);

    // Also track in orchestrator's aiServices map for system prompt building
    this.orchestrator.aiServices.set(aiId, {
      service,
      config: { providerKey, modelKey },
      id: aiId,
      name: service.getName(),
      displayName,
      displayAlias: alias,
      alias: `@${alias}`,
      normalizedAlias: alias,
      emoji: "🤖",
      isActive: true,
      lastMessageTime: 0,
    } as unknown as ReturnType<typeof this.orchestrator.aiServices.get>);

    return participantId;
  }

  /**
   * Start a conversation with an initial message
   */
  async startConversation(initialMessage: string): Promise<void> {
    if (this.participants.length < 2) {
      throw new Error("At least two participants are required for a conversation");
    }

    this.isActive = true;
    this.startTime = Date.now();
    this.turnCount = 0;
    this._messages = [];
    this.orchestrator.contextManager.clear();

    // Add initial user message
    this.addMessage({
      role: "user",
      content: initialMessage,
      participantId: null,
    });

    console.log("Starting conversation...");
    console.log(`Participants: ${this.participants.map((p) => p.name).join(", ")}`);

    await streamText(initialMessage, "[User]: ", STREAM_WORD_DELAY_MS);
    await this.handleInternalResponders(this._messages[this._messages.length - 1]);

    await this.continueConversation();
  }

  /**
   * Continue conversation for remaining turns
   */
  async continueConversation(): Promise<void> {
    while (this.isActive && this.turnCount < this.config.maxTurns) {
      if (this.startTime && Date.now() - this.startTime > this.config.timeoutMs) {
        console.log("Conversation timed out");
        this.isActive = false;
        break;
      }

      // Round-robin participant selection
      const participantIndex = this.turnCount % this.participants.length;
      const participant = this.participants[participantIndex];

      try {
        const response = await this.generateResponse(participant);

        if (!response || response.trim().length === 0) {
          console.log(`Participant ${participant.name} provided empty response, skipping turn`);
          this.turnCount++;
          continue;
        }

        this.addMessage({
          role: "assistant",
          content: response,
          participantId: participant.id,
        });

        await streamText(response, `[${participant.name}]: `, STREAM_WORD_DELAY_MS);
        await this.handleInternalResponders(this._messages[this._messages.length - 1]);

        this.turnCount++;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error in conversation: ${errorMessage}`);
        this.isActive = false;
        break;
      }
    }

    if (this.turnCount >= this.config.maxTurns) {
      console.log(`Conversation reached maximum turns (${this.config.maxTurns})`);
      this.isActive = false;
    }
  }

  /**
   * Generate response from a participant using orchestrator's system prompts
   */
  async generateResponse(participant: CLIParticipant): Promise<string> {
    const isLastTurn = this.turnCount >= this.config.maxTurns - 2;
    const lastMessage = this._messages.length > 0 ? this._messages[this._messages.length - 1] : null;
    const isResponseToOtherAI =
      lastMessage && lastMessage.participantId !== null && lastMessage.participantId !== participant.id;

    // Build system prompt using orchestrator utilities
    const context = this.orchestrator.contextManager.getContextForAI(50);
    const aiService = this.orchestrator.aiServices.get(participant.aiId);

    // Create system prompt - mix of core utilities and CLI-specific instructions
    let systemPrompt: string;

    if (aiService) {
      // Use orchestrator's enhanced system prompt builder
      systemPrompt = createEnhancedSystemPrompt(
        aiService,
        context,
        true, // isUserResponse
        this.orchestrator.aiServices
      );
    } else {
      // Fallback system prompt
      systemPrompt = this.buildFallbackSystemPrompt(participant);
    }

    // Add CLI-specific turn context
    const otherParticipants = this.participants
      .filter((p) => p.id !== participant.id)
      .map((p) => p.name)
      .join(", ");

    const turnContext = `
Turn context:
- This is turn #${this.turnCount + 1} of ${this.config.maxTurns}${isLastTurn ? " (FINAL TURN)" : ""}
- Other participants: ${otherParticipants}
${isLastTurn ? "- IMPORTANT: This is the FINAL message. Say goodbye naturally without continuing the discussion." : ""}
${isResponseToOtherAI ? "- DIRECTLY RESPOND to the last message from the other participant." : ""}`;

    const fullSystemPrompt = systemPrompt + "\n" + turnContext;

    const formattedMessages: Message[] = [
      { role: "system", content: fullSystemPrompt },
      ...this._messages.map((msg) => ({ role: msg.role, content: msg.content })),
    ];

    const response = await participant.service.generateResponse(formattedMessages);
    return this.truncateResponse(response.content);
  }

  /**
   * Add a message to conversation
   */
  addMessage(message: ConversationMessage): void {
    const enrichedMessage: ConversationMessage = {
      ...message,
      timestamp: new Date().toISOString(),
    };

    const participant =
      enrichedMessage.participantId !== null && enrichedMessage.participantId !== undefined
        ? this.participants[enrichedMessage.participantId]
        : null;

    const authorName =
      enrichedMessage.authorName ||
      participant?.name ||
      (enrichedMessage.participantId === null ? "User" : undefined);

    enrichedMessage.authorName = authorName;
    this._messages.push(enrichedMessage);

    // Sync to orchestrator's context manager
    this.orchestrator.contextManager.addMessage({
      role: enrichedMessage.role,
      content: enrichedMessage.content,
      timestamp: Date.now(),
      sender: authorName,
      senderType: enrichedMessage.participantId === null ? "user" : "ai",
      aiId: participant?.aiId,
    } as Parameters<ContextManager["addMessage"]>[0]);

    // Track stats
    const providerName =
      participant?.config?.provider?.name ||
      authorName ||
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
   * Get conversation history
   */
  getConversationHistory(): Array<{ from: string; content: string; timestamp: string }> {
    return this._messages.map((msg) => {
      const participant =
        msg.participantId !== null ? this.participants[msg.participantId!] : { name: "User" };

      return {
        from: msg.authorName || participant.name,
        content: msg.content,
        timestamp: msg.timestamp || "",
      };
    });
  }

  /**
   * Get messages array
   */
  getMessages(): ConversationMessage[] {
    return this._messages;
  }

  /**
   * Stop conversation
   */
  stopConversation(): void {
    this.isActive = false;
    console.log("Conversation stopped");
  }

  /**
   * Get context manager (for advanced use cases)
   */
  getContextManager(): ContextManager {
    return this.orchestrator.contextManager;
  }

  // Private helper methods

  private findProviderKey(provider: AIProvider): string {
    const entry = (Object.entries(AI_PROVIDERS) as [string, AIProvider][]).find(
      ([, p]) => p === provider
    );
    return entry ? entry[0] : "unknown";
  }

  private findModelKey(provider: AIProvider, model: AIModel): string {
    const entry = Object.entries(provider.models).find(([, m]) => m === model);
    return entry ? entry[0] : "unknown";
  }

  private buildFallbackSystemPrompt(participant: CLIParticipant): string {
    const initialTopic = this._messages[0]?.content || "general discussion";
    const otherParticipants = this.participants
      .filter((p) => p.id !== participant.id)
      .map((p) => `- ${p.name}`)
      .join("\n");

    return `You are ${participant.name} having a casual conversation about "${initialTopic}".

Guidelines:
• Keep responses concise (1-3 sentences)
• Don't introduce yourself or say "I'm [name]" - it's already clear who you are
• Don't repeat what others have said - add new perspectives
• Reference and respond to other participants naturally

Other participants:
${otherParticipants}`;
  }

  private truncateResponse(content: string): string {
    if (content.length > MAX_STREAMED_RESPONSE_LENGTH) {
      return content.substring(0, MAX_STREAMED_RESPONSE_LENGTH) + "...";
    }
    return content;
  }

  private async handleInternalResponders(sourceMessage: ConversationMessage): Promise<void> {
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

        await streamText(
          response.content,
          `[${response.authorName || responder.name || "Internal"}]: `,
          STREAM_WORD_DELAY_MS
        );
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Internal responder "${responder.name || "unknown"}" failed: ${errorMessage}`);
      }
    }
  }
}
