import type { AiParticipant } from "../types.js";

export const PERPLEXITY_PARTICIPANTS: AiParticipant[] = [
  // Perplexity Models - Sonar/signal
  {
    id: "PERPLEXITY_SONAR",
    name: "Perplexity Sonar",
    alias: "sonar",
    provider: "Perplexity",
    status: "active",
    emoji: "🔊",
  },
  {
    id: "PERPLEXITY_SONAR_PRO",
    name: "Perplexity Sonar Pro",
    alias: "sonar-pro",
    provider: "Perplexity",
    status: "active",
    emoji: "📡",
  },
  {
    id: "PERPLEXITY_SONAR_REASONING_PRO",
    name: "Sonar Reasoning Pro",
    alias: "sonar-reasoning-pro",
    provider: "Perplexity",
    status: "active",
    emoji: "🎛️",
  },
  {
    id: "PERPLEXITY_SONAR_DEEP_RESEARCH",
    name: "Sonar Deep Research",
    alias: "sonar-deep-research",
    provider: "Perplexity",
    status: "active",
    emoji: "🔬",
  },
];
