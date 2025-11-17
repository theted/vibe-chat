/**
 * ChatOrchestrator constants and configuration values
 */

// Default configuration values
export const DEFAULTS = {
  MAX_MESSAGES: 100,
  MAX_AI_MESSAGES: 10,
  MIN_USER_RESPONSE_DELAY: 1000, // 1 second
  MAX_USER_RESPONSE_DELAY: 10000, // 10 seconds
  MIN_BACKGROUND_DELAY: 10000, // 10 seconds
  MAX_BACKGROUND_DELAY: 30000, // 30 seconds
  MIN_DELAY_BETWEEN_AI: 1200,
  MAX_DELAY_BETWEEN_AI: 3200,
  TOPIC_CHANGE_CHANCE: 0.1, // 10% chance
};

// Context and message limits
export const CONTEXT_LIMITS = {
  AI_CONTEXT_SIZE: 25, // Messages to include in AI context
  RECENT_MESSAGES_FOR_PROMPT: 5, // Messages to analyze for system prompt
  RECENT_MESSAGES_FOR_STRATEGY: 8, // Messages to analyze for interaction strategy
  MAX_SENTENCES: 15, // Max sentences in AI response
  POTENTIAL_MENTION_TARGETS: 3, // Max potential targets to consider for mentions
};

// Timing thresholds
export const TIMING = {
  SILENCE_TIMEOUT: 120000, // 2 minutes - stop background messages after this
  SLEEP_RETRY_INTERVAL: 30000, // 30 seconds - retry interval when AIs are asleep
  MENTIONED_DELAY_MULTIPLIER: 0.35, // Respond faster when mentioned
  MIN_MENTIONED_DELAY: 400, // Minimum delay for mentioned AIs
};

// Interaction strategy weights
export const STRATEGY_WEIGHTS = {
  AGREE_AND_EXPAND: 0.3,
  CHALLENGE_AND_DEBATE: 0.25,
  REDIRECT_TOPIC: 0.15,
  ASK_QUESTION: 0.2,
  DIRECT_RESPONSE: 0.1,
};

// Weight adjustments for different contexts
export const STRATEGY_ADJUSTMENTS = {
  AI_MESSAGE_BACKGROUND_CHALLENGE: 0.2, // Increase challenge weight for AI-to-AI
  AI_MESSAGE_BACKGROUND_AGREE: 0.15, // Increase agree weight for AI-to-AI
  MANY_AI_MESSAGES_REDIRECT: 0.1, // Increase redirect when many AI messages
  MANY_AI_MESSAGES_QUESTION: 0.1, // Increase questions when many AI messages
  MANY_AI_MESSAGES_THRESHOLD: 3, // Threshold for "many" AI messages
};

// Mention behavior
export const MENTION_CONFIG = {
  RANDOM_MENTION_PROBABILITY: 0.35, // 35% chance to mention when not directly mentioned
};

// Responder selection
export const RESPONDER_CONFIG = {
  USER_RESPONSE_MAX_MULTIPLIER: 0.45, // Max 45% of AIs respond to user
  USER_RESPONSE_MIN_BASE: 1, // At least 1 AI responds to user
  USER_RESPONSE_MIN_COUNT: 2, // Minimum max responders for user messages
  BACKGROUND_MAX_MULTIPLIER: 0.25, // Max 25% of AIs in background conversation
  BACKGROUND_MIN_BASE: 0, // Background can have 0 responders
  BACKGROUND_MIN_COUNT: 1, // Minimum max responders for background
};

// Delay calculation
export const DELAY_CALC = {
  CATCH_UP_MULTIPLIER: 1500, // Randomness multiplier for catch-up delay
  CATCH_UP_POWER: 2, // Power function for catch-up delay
};

// Mention format templates - natural conversation patterns
export const MENTION_FORMATS = [
  // Direct address (front)
  (mention, response) => `${mention}, ${response}`,
  (mention, response) => `${mention} - ${response}`,
  (mention, response) => `Hey ${mention}, ${response}`,
  (mention, response) => `${mention}: ${response}`,
  (mention, response) => `${mention} ${response}`,

  // Questions (back)
  (mention, response) => `${response} What do you think, ${mention}?`,
  (mention, response) => `${response} Thoughts, ${mention}?`,
  (mention, response) => `${response} Agree, ${mention}?`,
  (mention, response) => `${response} ${mention}, does that make sense?`,
  (mention, response) => `${response} How would you approach this, ${mention}?`,
  (mention, response) => `${response} ${mention}, have you considered this?`,
  (mention, response) => `${response} What's your take on this, ${mention}?`,
  (mention, response) => `${response} ${mention}, am I missing something?`,
  (mention, response) => `${response} Curious for your perspective, ${mention}?`,
  (mention, response) => `${response} Right, ${mention}?`,
  (mention, response) => `${response} Don't you think, ${mention}?`,
  (mention, response) => `${response} ${mention}, you see what I mean?`,
  (mention, response) => `${response} ${mention}?`,

  // Collaborative/seeking input (back)
  (mention, response) => `${response} Curious what ${mention} thinks about this.`,
  (mention, response) => `${response} Would love ${mention}'s input here.`,
  (mention, response) => `${response} ${mention} might have thoughts on this.`,
  (mention, response) =>
    `${response} I'd be interested to hear from ${mention} too.`,
  (mention, response) =>
    `${response} ${mention}, you probably have experience with this?`,
  (mention, response) => `${response} Tagging ${mention} for visibility.`,
  (mention, response) => `${response} ${mention}, care to weigh in?`,
  (mention, response) => `${response} I wonder if ${mention} agrees with this.`,
  (mention, response) => `${response} Maybe ${mention} has a different view?`,
  (mention, response) =>
    `${response} Curious if ${mention} sees it differently.`,
  (mention, response) => `${response} cc ${mention}`,

  // Deferring/acknowledging expertise (back)
  (mention, response) => `${response} ${mention} would know better than me.`,
  (mention, response) =>
    `${response} ${mention}, you've dealt with this before, right?`,
  (mention, response) => `${response} Let's see what ${mention} says.`,
  (mention, response) =>
    `${response} ${mention} could probably add more context here.`,

  // Building on their point (front-mid blend)
  (mention, response) => `${mention}, building on what you said - ${response}`,
  (mention, response) => `${mention}, interesting point. ${response}`,
  (mention, response) => `${mention}, I think you're onto something. ${response}`,
];
