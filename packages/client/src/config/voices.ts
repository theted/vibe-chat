/**
 * Voice palette - every model has a colour of its own, used for its name,
 * avatar, mentions, quotes and typing line. Lightness/chroma live in CSS
 * (--voice-l / --voice-c) per theme, so a voice is just a hue.
 */

// The amber band (~50–95°) marks the user's own actions, so voices take the
// rest of the wheel: from 95° round past 360° to 50°
const VOICE_ARC_START = 95;
const VOICE_ARC_END = 410;
const VOICE_HUE_COUNT = 24;

/** Home hues, ~13° apart; each model is hashed onto one of these. */
export const VOICE_HUES: readonly number[] = Array.from(
  { length: VOICE_HUE_COUNT },
  (_, index) =>
    Math.round(
      VOICE_ARC_START +
        (index * (VOICE_ARC_END - VOICE_ARC_START)) / VOICE_HUE_COUNT,
    ) % 360,
);

// 141 models can't all look different, but the ones talking can: when two
// recent speakers' hues sit closer than this, the later one moves. Three
// palette steps (39-40° after rounding); fits 6-8 clearly distinct voices.
export const MIN_VOICE_GAP = 38;

// "Recent" for both the sidebar's talking list and the colour spreading:
// roughly what fits on screen
export const ROOM_SPEAKER_LOOKBACK = 30;
export const MAX_LISTED_SPEAKERS = 8;

// Lab-level views (dashboard tables) colour by provider; the labs people see
// most get fixed, well-separated hues, everyone else is hashed onto VOICE_HUES
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
