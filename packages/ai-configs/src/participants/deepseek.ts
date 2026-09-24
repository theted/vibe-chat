import type { AiParticipant } from "../types.js";

export const DEEPSEEK_PARTICIPANTS: AiParticipant[] = [
  // DeepSeek Models - Deep ocean creatures
  // V4 Pro / V4 Flash parked 2026-09-11: DeepSeek serves both ids with V4.1 Flash.
  // deepseek-chat / deepseek-reasoner discontinued 2026-07-24 — removed.
  {
    id: "DEEPSEEK_DEEPSEEK_V4_PRO",
    name: "DeepSeek V4 Pro",
    alias: "deepseek-v4-pro",
    provider: "DeepSeek",
    status: "inactive",
    emoji: "🐋",
  },
  {
    id: "DEEPSEEK_DEEPSEEK_V4_FLASH",
    name: "DeepSeek V4 Flash",
    alias: "deepseek-v4-flash",
    provider: "DeepSeek",
    status: "inactive",
    emoji: "🐬",
  },
  {
    id: "DEEPSEEK_DEEPSEEK_FLASH",
    name: "DeepSeek V4.1 Flash",
    alias: "deepseek-v4.1-flash",
    provider: "DeepSeek",
    status: "active",
    emoji: "🦈",
  },
];
