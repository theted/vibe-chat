/**
 * Extra mention targets shown in the AI selection dialog that are not part of
 * DEFAULT_AI_PARTICIPANTS — generic aliases users commonly type.
 */
import { resolveEmoji } from "@ai-chat/ai-configs";

export const EXTRA_AI_PARTICIPANTS = [
  {
    id: "OPENAI_GPT4",
    name: "gpt-4",
    alias: "gpt-4",
    provider: "OpenAI",
    emoji: resolveEmoji("gpt-4"),
  },
  {
    id: "OPENAI_CHATGPT",
    name: "chatgpt",
    alias: "chatgpt",
    provider: "OpenAI",
    emoji: resolveEmoji("chatgpt"),
  },
];
