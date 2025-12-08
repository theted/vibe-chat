/**
 * Shared constants for AI provider configurations
 */
export declare const DEFAULT_TEMPERATURE = 0.7;
export declare const DEFAULT_MAX_TOKENS = 4096;
export declare const SHORT_RESPONSE_MAX_TOKENS = 3500;
export interface ConversationConfig {
    maxTurns: number;
    timeoutMs: number;
    logLevel: string;
}
export declare const DEFAULT_CONVERSATION_CONFIG: ConversationConfig;
//# sourceMappingURL=constants.d.ts.map