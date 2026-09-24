import type { AiParticipant } from "../types.js";

export const ANTHROPIC_PARTICIPANTS: AiParticipant[] = [
  // Anthropic Models - Music/performing arts
  // claude-fable-5 suspended 2026-06-12 by US export-control directive — removed. Its successor
  // claude-fable-5-1 is generally available (see providers/anthropic.ts).
  {
    id: "ANTHROPIC_CLAUDE_OPUS_4_8",
    name: "Claude Opus 4.8",
    alias: "claude-opus-4-8",
    provider: "Anthropic",
    status: "active",
    emoji: "🎙️",
    // Measured and deliberate: slower to reply, doesn't dominate the room
    traits: { tempo: 1.25, chattiness: 0.9 },
  },
  {
    id: "ANTHROPIC_CLAUDE_OPUS_4_7",
    name: "Claude Opus 4.7",
    alias: "claude-opus-4-7",
    provider: "Anthropic",
    status: "active",
    emoji: "🎤",
  },
  {
    id: "ANTHROPIC_CLAUDE_OPUS_4_6",
    name: "Claude Opus 4.6",
    alias: "claude-opus-4-6",
    provider: "Anthropic",
    status: "active",
    emoji: "🎶",
  },
  {
    id: "ANTHROPIC_CLAUDE_SONNET_4_6",
    name: "Claude Sonnet 4.6",
    alias: "claude-sonnet-4-6",
    provider: "Anthropic",
    status: "active",
    emoji: "🎷",
  },
  {
    id: "ANTHROPIC_CLAUDE_SONNET_4_5",
    name: "Claude 4.5 Sonnet",
    alias: "claude-sonnet-4-5",
    provider: "Anthropic",
    status: "active",
    emoji: "🎹",
  },
  {
    id: "ANTHROPIC_CLAUDE_HAIKU_4_5",
    name: "Claude Haiku 4.5",
    alias: "claude-haiku-4-5",
    provider: "Anthropic",
    status: "active",
    emoji: "🎵",
  },
  {
    id: "ANTHROPIC_CLAUDE_OPUS_4_1",
    name: "Claude Opus 4.1",
    alias: "claude-opus-4-1",
    provider: "Anthropic",
    status: "active",
    emoji: "🎺",
  },
  {
    id: "ANTHROPIC_CLAUDE_OPUS_5",
    name: "Claude Opus 5",
    alias: "claude-opus-5",
    provider: "Anthropic",
    status: "active",
    emoji: "🎸",
  },
  {
    id: "ANTHROPIC_CLAUDE_SONNET_5",
    name: "Claude Sonnet 5",
    alias: "claude-sonnet-5",
    provider: "Anthropic",
    status: "active",
    emoji: "🥁",
  },
  {
    id: "ANTHROPIC_CLAUDE_FABLE_5_1",
    name: "Claude Fable 5.1",
    alias: "claude-fable-5-1",
    provider: "Anthropic",
    status: "active",
    emoji: "🎻",
    // Slowest and priciest model in the room: replies less often so it doesn't dominate cost
    traits: { tempo: 1.35, chattiness: 0.8 },
  },
  {
    id: "ANTHROPIC_CLAUDE_OPUS_5_5",
    name: "Claude Opus 5.5",
    alias: "claude-opus-5-5",
    provider: "Anthropic",
    status: "active",
    emoji: "🎼",
  },
];
