/**
 * ChatOrchestrator constants and configuration values
 */

// Default configuration values
export const DEFAULTS = {
  MAX_MESSAGES: 100,
  // Hard cap on AI messages in one room between two human messages. Every
  // AI message counts, @Chat's included; at the cap the room goes quiet
  // until a person posts there again.
  MAX_AI_MESSAGES: 10,
  MAX_CONCURRENT_RESPONSES: 2, // Hard limit on simultaneous AI responses
  MIN_USER_RESPONSE_DELAY: 4000, // 4 seconds - delay before AI responds to user
  MAX_USER_RESPONSE_DELAY: 22000, // 22 seconds
  MIN_BACKGROUND_DELAY: 30000, // 30 seconds - delay for background Vibe chatter
  MAX_BACKGROUND_DELAY: 90000, // 90 seconds
  MIN_DELAY_BETWEEN_AI: 6000, // 6 seconds - stagger between AI responses
  MAX_DELAY_BETWEEN_AI: 18000, // 18 seconds
  // First AI responder delay - gives conversation breathing room
  MIN_FIRST_RESPONDER_DELAY: 2500, // 2.5 seconds
  MAX_FIRST_RESPONDER_DELAY: 4500, // 4.5 seconds
} as const;

// Context and message limits
export const CONTEXT_LIMITS = {
  AI_CONTEXT_SIZE: 50, // Messages to include in AI context
  RECENT_MESSAGES_FOR_PROMPT: 5, // Messages to analyze for system prompt
  RECENT_MESSAGES_FOR_STRATEGY: 8, // Messages to analyze for interaction strategy
  MAX_SENTENCES: 15, // Max sentences in AI response
  QUOTE_EXCERPT_LENGTH: 140, // Max chars when quoting a message back in instructions
} as const;

// Quote-replies (utils/orchestrator/quoteReplies.ts)
export const QUOTE_REPLY = {
  EXCERPT_LENGTH: 280, // Chars of the quoted message a reply keeps as its snapshot
} as const;

// The prompt behind each AI's latest reply per room, for /debug
// (orchestrator/PromptLog.ts). A record holds a whole context window.
export const PROMPT_LOG = {
  MAX_RECORDS: 100,
} as const;

// Rolling digest of messages evicted from the context window, so AIs can
// still reference things said before the sliding window cut-off
export const CONVERSATION_DIGEST = {
  MAX_ENTRIES: 40, // One-line entries kept before the oldest are dropped
  EXCERPT_LENGTH: 90, // Max chars per digest line
} as const;

// Timing thresholds
export const TIMING = {
  SILENCE_TIMEOUT: 120000, // 2 minutes - stop background messages after this
  SLEEP_RETRY_INTERVAL: 30000, // 30 seconds - retry interval when AIs are asleep
  QUEUE_RETRY_INTERVAL: 1000, // 1 second - retry interval when queue is at capacity
  MENTIONED_DELAY_MULTIPLIER: 0.35, // Respond faster when mentioned
  MIN_MENTIONED_DELAY: 400, // Minimum delay for mentioned AIs
  TYPING_AWARENESS_DELAY: 2500, // Additional delay per typing AI (ms)
  TYPING_AWARENESS_MAX_MULTIPLIER: 3.0, // Max multiplier when AIs are typing
} as const;

// Interaction strategy weights
export const STRATEGY_WEIGHTS = {
  AGREE_AND_EXPAND: 0.3,
  CHALLENGE_AND_DEBATE: 0.25,
  REDIRECT_TOPIC: 0.15,
  ASK_QUESTION: 0.2,
  DIRECT_RESPONSE: 0.1,
} as const;

// Weight adjustments for different contexts
export const STRATEGY_ADJUSTMENTS = {
  AI_MESSAGE_BACKGROUND_CHALLENGE: 0.2, // Increase challenge weight for AI-to-AI
  AI_MESSAGE_BACKGROUND_AGREE: 0.15, // Increase agree weight for AI-to-AI
  MANY_AI_MESSAGES_REDIRECT: 0.1, // Increase redirect when many AI messages
  MANY_AI_MESSAGES_QUESTION: 0.1, // Increase questions when many AI messages
  MANY_AI_MESSAGES_THRESHOLD: 3, // Threshold for "many" AI messages
} as const;

// Mention behavior
export const MENTION_CONFIG = {
  RANDOM_MENTION_PROBABILITY: 0.35, // 35% chance to mention when not directly mentioned
} as const;

// Response energy - varies message length per response so the chat isn't a
// uniform stream of 1-3 sentence replies
export const RESPONSE_ENERGY_WEIGHTS = {
  terse: 0.25,
  normal: 0.6,
  expansive: 0.15,
} as const;

export type ResponseEnergy = keyof typeof RESPONSE_ENERGY_WEIGHTS;

export const RESPONSE_ENERGY_INSTRUCTIONS: Record<ResponseEnergy, string> = {
  terse:
    "Keep it very short this time: a quick reaction, quip, or single short sentence.",
  normal: "",
  expansive:
    "Take a bit more room this time: develop your thought across 4-6 sentences before wrapping up.",
} as const;

export const MENTION_LIMITS = {
  MAX_UNIQUE_PER_RESPONSE: 2,
} as const;

// Responder selection
export const RESPONDER_CONFIG = {
  USER_RESPONSE_MAX_MULTIPLIER: 0.3, // Max 30% of AIs respond to user (reduced from 45%)
  USER_RESPONSE_MIN_BASE: 1, // At least 1 AI responds to user
  USER_RESPONSE_MIN_COUNT: 1, // Minimum max responders for user messages (reduced from 2)
  // Absolute caps: with dozens of models loaded, 30% of the room would spend
  // the whole MAX_AI_MESSAGES budget on one human message
  USER_RESPONSE_MAX_COUNT: 3,
  BACKGROUND_MAX_MULTIPLIER: 0.25, // Max 25% of AIs in background conversation
  BACKGROUND_MIN_BASE: 0, // Background can have 0 responders
  BACKGROUND_MIN_COUNT: 1, // Minimum max responders for background
  BACKGROUND_MAX_COUNT: 2,
} as const;

// A private group's cast is a handful of models, so a share of the room would
// round down to a single responder - answer like a lively main room instead
export const PRIVATE_GROUP_RESPONDERS = {
  MIN: 1,
  MAX: 3,
} as const;

// Delay calculation
export const DELAY_CALC = {
  CATCH_UP_MULTIPLIER: 1500, // Randomness multiplier for catch-up delay
  CATCH_UP_POWER: 2, // Power function for catch-up delay
} as const;

// Heavy-tailed (log-normal) delay sampling - most replies land early in the
// [min, max] band with occasional stragglers, instead of an even spread
export const DELAY_DISTRIBUTION = {
  SIGMA: 0.6, // Log-normal shape; higher = more variance
  MEDIAN_BAND_POSITION: 0.35, // Median delay lands ~35% into the band
  MAX_OVERSHOOT: 1.5, // Rare stragglers may exceed max by up to 50%
} as const;

// Simulated typing after generation - message is held while the typing
// indicator stays visible, proportional to response length
export const TYPING_SIMULATION = {
  CHARS_PER_SECOND: 40,
  MIN_HOLD_MS: 600,
  MAX_HOLD_MS: 4000,
} as const;

// Per-AI temperament defaults. AIs without explicit traits in participant
// config get stable values hashed from their id within these bands, so every
// AI has a slightly different feel without hand-tuning each one.
export const TRAIT_DEFAULTS = {
  MIN_TEMPO: 0.8, // Fastest derived delay multiplier
  MAX_TEMPO: 1.3, // Slowest derived delay multiplier
  MIN_CHATTINESS: 0.7, // Least talkative derived selection weight
  MAX_CHATTINESS: 1.4, // Most talkative derived selection weight
} as const;

// Fade-out sleep - instead of a hard stop at maxAIMessages, background
// chatter gets sparser and slower as the message budget runs out
export const FADE_OUT = {
  START_RATIO: 0.6, // Fatigue level where fading begins
  MIN_RESPONSE_PROBABILITY: 0.25, // Response chance at full fatigue
  MAX_DELAY_STRETCH: 2.0, // Delay multiplier at full fatigue
  WIND_DOWN_RATIO: 0.8, // Fatigue level where prompts start winding down
} as const;

// Silence-aware reopening - occasionally have one AI reopen a room that has
// gone quiet past the silence timeout, instead of staying silent forever
export const REOPENING = {
  PROBABILITY_PER_TICK: 0.2, // Chance per background tick during silence
  MAX_SILENCE_MS: 30 * 60_000, // Give up reopening after this much silence
  MIN_DELAY_MS: 3000, // Reopener responds fairly promptly...
  MAX_DELAY_MS: 15000, // ...the room is already quiet
} as const;

// Dead-air recovery (issue #311): when a person's message gets no AI reply at
// all (the mentioned model failed or timed out, a handle matched nobody, or
// nobody picked it up), @Chat hands it to one AI. It only fires once nothing
// is queued, generating or held for the room, so busy rooms never see it.
export const UNANSWERED = {
  QUIET_MS: 60_000, // How long a person's message may go unanswered
  RECHECK_MS: 10_000, // Look again this often while replies are still pending
  ROOM_COOLDOWN_MS: 5 * 60_000, // At most one hand-off per room per window
} as const;

// How the room's history is shown to a model. Every message from someone
// else is a user turn labelled with its speaker; the model's own earlier
// messages are its assistant turns. Without labels a model sees every other
// AI's message as something it said itself.
export const TRANSCRIPT = {
  HUMAN_SUFFIX: " (human)",
  SYSTEM_LABEL: "System",
  // Opens the transcript when it would otherwise start with the model's own
  // turn - several providers require the first message to be a user turn
  CONTINUATION_NOTE: "[System] (earlier messages omitted)",
  // A quote-reply's label names what it answers: "#14 Ada (human), replying to #12 Claude"
  REPLYING_TO: "replying to",
  OWN_MESSAGE: "your message",
  TURN_HEADER: "---\nNote from the chat app (only you see this):",
  NO_LABEL_REMINDER:
    "Write only your chat message itself - no [Name] label, and don't speak for anyone else.",
  // Appended to the turn note so the model can tell how long ago things were said
  CURRENT_TIME: (now: string) => `Current time: ${now}.`,
} as const;

// Send times in the transcript (issue #295). One fixed zone so every model
// and every room reads the same clock; the label names it explicitly.
export const TRANSCRIPT_TIME = {
  ZONE: "UTC",
} as const;

// System prompt templates - easily configurable conversation guidelines
export const SYSTEM_PROMPT = {
  // Opening line: who the model is and the kind of room it's in. Same for
  // every model - models speak as themselves, so there are no personas here.
  ROLE: (selfName?: string, selfHandle?: string | null) =>
    `You are ${selfName}${selfHandle ? ` (@${selfHandle})` : ""}, one participant in a shared group chat where several AI models and humans talk together.`,

  // Introduction based on context
  INTRO_USER_RESPONSE:
    "A user just posted. Respond naturally and conversationally.",
  INTRO_BACKGROUND: "Continue the ongoing conversation between AIs.",

  // Core conversation guidelines (the shared room contract)
  GUIDELINES: `
Key guidelines:
• Usually keep responses 1-3 sentences and conversational - but follow any specific length instruction you're given, and an occasional one-word reaction is fine
• Build on recent messages (the latest matter most) and add new value instead of repeating what others just said
• Offer your own perspective: challenge, expand on or redirect the conversation, or ask a question that sparks discussion
• Use @mentions intentionally: an @mention summons that AI to answer you next, so only mention someone you actually want a reply from, using the exact @handle from the participant list below
• Mention at most two unique AIs per response, each only once, and often none. Weave a mention in naturally and vary where it goes ("@handle, building on what you said..." or "...what do you think, @handle?")
• To answer a specific earlier message rather than the latest one, start your message with [reply #12], using that message's number; the chat shows it as a quote above your reply. Only do this when it wouldn't otherwise be clear which message you mean
• Don't use em dashes (—): use a comma, a period, parentheses or a plain hyphen instead`,

  // What @Chat is for (only where the server runs it). It holds the room
  // while it works and takes one AI question per room per cooldown
  // (CHAT_ASSISTANT_AI_COOLDOWN_MS on the server), so the guidance asks for
  // one question, then waiting.
  CHAT_ASSISTANT: (canFileIssues: boolean) => `
@Chat is the room's research assistant, not a chat participant. Asking it is optional, but encouraged when a fact would help and you aren't sure of it: how Vibe Chat's own code and config work (it searches the source), its GitHub issues (it searches them${canFileIssues ? ", files a new one when someone explicitly asks for that, and comments on issues it filed" : "; it can't file issues from a private chat"}), or anything to look up on the web.
• Ask one clear, self-contained question with @Chat, then wait: the room pauses while it works and its answer comes back to you
• Don't ask what you already know or the conversation doesn't need, and never repeat a question; it takes one question from an AI every few minutes per room and ignores the rest`,

  // Explains the labelled transcript format (see TRANSCRIPT)
  TRANSCRIPT_FORMAT:
    "How to read the chat: each message from someone else starts with its number, speaker's name and send time (UTC) in square brackets, e.g. [#12 Claude, 2026-11-27 20:03] or [#13 Ada (human), 20:05]; the date is shown when the day changes. A quote-reply also says which message it answers, e.g. [#14 Ada (human), 20:06, replying to #12 Claude]. The current time is given in the note at the end, so you can tell what was said just now and what was said a long while ago. Your own earlier messages are your previous turns. Pay attention to who said what, and answer the person you are replying to - not whoever spoke last.",

  // Roster of the other AIs (utils/orchestrator/roster.ts), split by who has
  // posted in what the model can see, so it doesn't answer an AI that hasn't
  // said anything yet
  ROSTER_HEADER:
    "Other AIs in this chat (only respond to what someone has actually said):",
  ROSTER_ACTIVE: "Active in this conversation:",
  ROSTER_SILENT: "Also in the room (haven't posted yet):",

  // Header for the rolling digest of messages evicted from the context window
  DIGEST_HEADER:
    "Earlier in this conversation (older messages, one line each with its send time in UTC - you can reference these but don't quote them verbatim):",

  // Closing message
  CLOSING: "Respond naturally and keep the conversation flowing!",
} as const;

// Interaction strategy instruction templates
export const STRATEGY_INSTRUCTIONS = {
  MENTIONED_BY_AI: (mentionerToken: string, excerpt?: string) =>
    excerpt
      ? `You were directly mentioned by ${mentionerToken}, who said: "${excerpt}". Respond specifically to that message and address the key points they raised. You are already answering them, so don't @mention ${mentionerToken} again unless you ask them something new.`
      : `You were directly mentioned by ${mentionerToken}. Respond specifically to their message and address the key points they raised. You are already answering them, so don't @mention ${mentionerToken} again unless you ask them something new.`,
  MENTIONED_BY_USER: (excerpt?: string) =>
    excerpt
      ? `You were directly mentioned by the user, who said: "${excerpt}". Respond directly to that message and focus on answering or acknowledging their mention.`
      : "You were directly mentioned by the user. Respond directly to their message and focus on answering or acknowledging their mention.",
  QUOTED_MESSAGE: (quotedSender: string | null, excerpt: string) =>
    quotedSender
      ? `That message quote-replies to ${quotedSender}, who said: "${excerpt}".`
      : `That message quote-replies to your earlier message: "${excerpt}".`,
  AGREE_EXPAND: (senderName: string) =>
    `Build on ${senderName}'s point and add your own insights. Show agreement but expand with new information or examples.`,
  CHALLENGE: (senderName: string) =>
    `Respectfully challenge ${senderName}'s perspective. Offer a counterpoint or alternative viewpoint while keeping it constructive.`,
  REDIRECT:
    "Gracefully steer the conversation toward a related but new angle or topic that might be more interesting.",
  QUESTION:
    "Ask a thought-provoking question that will get the other AIs thinking and responding.",
  DIRECT: "Respond directly to that message with your perspective.",
  REPLY_TO: (speakerLabel: string, excerpt: string) =>
    `You are replying to ${speakerLabel}, who said: "${excerpt}".`,
  PRIVATE_CHAT:
    "This is a private one-to-one conversation with the user. No other AI is present, so do not @mention or address any other assistant - talk to the user directly.",
  PRIVATE_GROUP:
    "This is a private conversation between the user and the AIs listed as being in this chat - nobody else can see it. Only address or @mention AIs who are in this chat.",
  REOPEN:
    "The room has been quiet for a while. Casually reopen the conversation - pick up a loose thread from earlier, share a new thought on the topic, or nudge someone with a question. Keep it light and natural, like breaking a lull.",
  WIND_DOWN:
    "The conversation is naturally winding down. Keep this brief - a closing thought, a light sign-off remark, or a short reaction rather than opening new threads.",
  MENTION_TARGET: (mentionHandle: string) =>
    `If it fits naturally, address ${mentionHandle} directly in your response - weave the @mention in organically (start, middle, or end), or skip it if it would feel forced.`,
} as const;
