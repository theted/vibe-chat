// Constants used for Redis-backed statistics tracking
// Centralizing keys and limits keeps them consistent across frontend services.

export const STATS_TOTAL_MESSAGES_KEY = "ai-chat:stats:messages:total";
export const STATS_TOTAL_AI_MESSAGES_KEY = "ai-chat:stats:messages:ai";
export const STATS_TOTAL_USER_MESSAGES_KEY = "ai-chat:stats:messages:user";
export const STATS_LATEST_MESSAGES_KEY = "ai-chat:stats:messages:latest";

export const STATS_MAX_LATEST_MESSAGES = 100;
export const STATS_MAX_CONTENT_LENGTH = 1000;
