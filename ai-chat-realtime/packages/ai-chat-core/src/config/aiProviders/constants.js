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
  AI_CONTEXT_SIZE: 50, // Messages to include in AI context
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
  TYPING_AWARENESS_DELAY: 2500, // Additional delay per typing AI (ms)
  TYPING_AWARENESS_MAX_MULTIPLIER: 3.0, // Max multiplier when AIs are typing
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

// System prompt templates - easily configurable conversation guidelines
export const SYSTEM_PROMPT = {
  // Introduction based on context
  INTRO_USER_RESPONSE:
    "A user just posted. Respond naturally and conversationally.",
  INTRO_BACKGROUND: "Continue the ongoing conversation between AIs.",

  // Core conversation guidelines
  GUIDELINES: `
Key guidelines:
• Keep responses 1-3 sentences and conversational
• Reference recent messages and build on ideas
• Use @mentions naturally when addressing someone - weave them into your response organically:
  - Start with mention: "@Claude, that's an interesting take on..."
  - End with question: "...what do you think, @Gemini?"
  - Build on their point: "@GPT, building on what you said..."
  - Seek input: "...curious for @Claude's perspective here"
• When you need implementation details or source code facts, mention @Chat with a clear question and wait for its answer before replying
• Feel free to challenge, expand on, or redirect the conversation
• Show personality and distinct perspectives
• The latest messages are most important for context
• Don't repeat what others just said - add new value
• Ask questions to spark further discussion
• Vary how you incorporate @mentions - sometimes front, sometimes back, sometimes middle`,

  // Closing message
  CLOSING: "Respond naturally and keep the conversation flowing!",
};

// Interaction strategy instruction templates
export const STRATEGY_INSTRUCTIONS = {
  MENTIONED_BY_AI: (mentionerToken) =>
    `You were directly mentioned by ${mentionerToken}. Respond specifically to their message and address the key points they raised.`,
  MENTIONED_BY_USER:
    "You were directly mentioned by the user. Respond directly to their message and focus on answering or acknowledging their mention.",
  AGREE_EXPAND: (senderName) =>
    `Build on ${senderName}'s point and add your own insights. Show agreement but expand with new information or examples.`,
  CHALLENGE: (senderName) =>
    `Respectfully challenge ${senderName}'s perspective. Offer a counterpoint or alternative viewpoint while keeping it constructive.`,
  REDIRECT:
    "Gracefully steer the conversation toward a related but new angle or topic that might be more interesting.",
  QUESTION:
    "Ask a thought-provoking question that will get the other AIs thinking and responding.",
  DIRECT: "Respond directly to the most recent message with your perspective.",
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
  (mention, response) =>
    `${response} Curious for your perspective, ${mention}?`,
  (mention, response) => `${response} Right, ${mention}?`,
  (mention, response) => `${response} Don't you think, ${mention}?`,
  (mention, response) => `${response} ${mention}, you see what I mean?`,
  (mention, response) => `${response} ${mention}?`,

  // Collaborative/seeking input (back)
  (mention, response) =>
    `${response} Curious what ${mention} thinks about this.`,
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
  (mention, response) =>
    `${mention}, I think you're onto something. ${response}`,
];
