/**
 * Context Manager - Handles conversation context with sliding window
 */
import { IContextManager, ContextMessage, ContextManagerConfig } from '../types/orchestrator.js';
import { Message } from '../types/index.js';
export declare class ContextManager implements IContextManager {
    private messages;
    private config;
    constructor(maxMessages?: number);
    /**
     * Add a message to the context
     */
    addMessage(message: Message): void;
    /**
     * Get context for AI (recent messages)
     */
    getContext(limit?: number): ContextMessage[];
    /**
     * Get context for AI (recent messages) - alias for compatibility
     */
    getContextForAI(limit?: number): ContextMessage[];
    /**
     * Get all messages in context
     */
    getAllMessages(): ContextMessage[];
    /**
     * Clear the context
     */
    clear(): void;
    /**
     * Get the number of messages in context
     */
    size(): number;
    /**
     * Check if context has any messages
     */
    hasMessages(): boolean;
    /**
     * Get the last message
     */
    getLastMessage(): ContextMessage | null;
    /**
     * Get messages from a specific sender
     */
    getMessagesBySender(sender: string): ContextMessage[];
    /**
     * Get messages by role
     */
    getMessagesByRole(role: 'user' | 'assistant'): ContextMessage[];
    /**
     * Get recent context window
     */
    getRecentContext(windowSize?: number): ContextMessage[];
    /**
     * Update context configuration
     */
    updateConfig(config: Partial<ContextManagerConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): ContextManagerConfig;
    /**
     * Get context metrics
     */
    getMetrics(): Record<string, unknown>;
    /**
     * Find messages containing mentions
     */
    getMessagesWithMentions(): ContextMessage[];
    /**
     * Get context summary for prompts
     */
    getContextSummary(): string;
}
//# sourceMappingURL=ContextManager.d.ts.map