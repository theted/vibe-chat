import type { AiParticipant } from "../types.js";

export const GROK_PARTICIPANTS: AiParticipant[] = [
  // xAI/Grok Models - Gaming/arcade
  {
    id: "GROK_GROK_4_3",
    name: "Grok 4.3",
    alias: "grok-4.3",
    provider: "xAI",
    status: "active",
    emoji: "♟️",
    // Brand personality: quick-draw and talkative
    traits: { tempo: 0.7, chattiness: 1.4 },
  },
  {
    id: "GROK_GROK_4_20",
    name: "Grok 4.20",
    alias: "grok-4.20",
    provider: "xAI",
    status: "active",
    emoji: "🎳",
  },
  {
    id: "GROK_GROK_4_20_REASONING",
    name: "Grok 4.20 Reasoning",
    alias: "grok-4.20-reasoning",
    provider: "xAI",
    status: "active",
    emoji: "🧩",
  },
  {
    id: "GROK_GROK_4_20_MULTI_AGENT",
    name: "Grok 4.20 Multi-Agent",
    alias: "grok-4.20-multi-agent",
    provider: "xAI",
    status: "active",
    emoji: "🪀",
  },
  {
    id: "GROK_GROK_4_6",
    name: "Grok 4.6",
    alias: "grok-4.6",
    provider: "Grok",
    status: "active",
    emoji: "🏁",
  },
  {
    id: "GROK_GROK_4_5",
    name: "Grok 4.5",
    alias: "grok-4.5",
    provider: "Grok",
    status: "active",
    emoji: "🎱",
  },
  {
    id: "GROK_GROK_4_7",
    name: "Grok 4.7",
    alias: "grok-4.7",
    provider: "Grok",
    status: "active",
    emoji: "🕹️",
  },
];
