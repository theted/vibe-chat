/**
 * Voice palette - hues handed out to providers so every model from the same
 * lab reads as one colour across the transcript, sidebar and typing line.
 * Lightness/chroma live in CSS (--voice-l / --voice-c) per theme.
 */

// Spread round the wheel ~30° apart, skipping the amber band (~50–95°) that
// marks the user's own actions
export const VOICE_HUES = [
  20, 115, 145, 175, 205, 235, 265, 295, 325, 355,
] as const;

// The labs people see most get fixed, well-separated hues so the common
// line-up never collides; everyone else is hashed onto VOICE_HUES
export const PROVIDER_HUES: Record<string, number> = {
  anthropic: 25,
  openai: 150,
  google: 235,
  "mistral ai": 325,
  mistral: 325,
  deepseek: 205,
  xai: 290,
  grok: 290,
  meta: 260,
  qwen: 175,
  "z.ai": 115,
  cohere: 355,
  "moonshot ai": 265,
};

// Spinner bars cycle through these so the loader shows several voices at once
export const SPINNER_HUES = [285, 200, 150, 340, 245, 20, 175] as const;

// Loader signals on the cyan logo: violet and rose, so they read against it
export const LOGO_SIGNAL_HUES = [285, 340] as const;

// Humans are neutral: colour is how you tell the models apart
export const HUMAN_VOICE_HUE = 270;

// The room aura blends the voices heard most recently. Lookback bounds how
// far back "recently" reaches; the count matches the aura's three glows.
export const ROOM_VOICE_COUNT = 3;
export const ROOM_VOICE_LOOKBACK = 16;

// Before any model has spoken the room glows like the circuit board: cyan,
// azure, blue. Must match the @property initial values in index.css.
export const AMBIENT_ROOM_HUES = [190, 215, 250] as const;
