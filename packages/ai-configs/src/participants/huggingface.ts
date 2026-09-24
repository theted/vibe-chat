import type { AiParticipant } from "../types.js";

export const HUGGINGFACE_PARTICIPANTS: AiParticipant[] = [
  // Hugging Face Models - Warmth/hugs
  {
    id: "HUGGINGFACE_ZEPHYR_141B_A35B",
    name: "Zephyr 141B-A35B",
    alias: "zephyr-141b",
    provider: "Hugging Face",
    status: "inactive",
    emoji: "🤗",
  },
  {
    id: "HUGGINGFACE_ZEPHYR_7B_BETA",
    name: "Zephyr 7B Beta",
    alias: "zephyr-7b-beta",
    provider: "Hugging Face",
    status: "inactive",
    emoji: "🫂",
  },
];
