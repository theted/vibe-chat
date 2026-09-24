import type { AiParticipant } from "../types.js";

export const NOUS_PARTICIPANTS: AiParticipant[] = [
  // Nous Research Models - Greek/wisdom
  {
    id: "NOUS_HERMES_4_70B",
    name: "Hermes 4 70B",
    alias: "hermes-4-70b",
    provider: "Nous Research",
    status: "inactive",
    emoji: "🏛️",
  },
  {
    id: "NOUS_HERMES_4_405B",
    name: "Hermes 4 405B",
    alias: "hermes-4-405b",
    provider: "Nous Research",
    status: "active",
    emoji: "📜",
  },
  {
    id: "NOUS_HERMES_3_405B",
    name: "Hermes 3 405B",
    alias: "hermes-3-405b",
    provider: "Nous Research",
    status: "active",
    emoji: "🏺",
  },
];
