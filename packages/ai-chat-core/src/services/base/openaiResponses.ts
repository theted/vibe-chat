import type { OpenAIMessage } from "../../types/index.js";
import {
  OpenAIClient,
  ServiceAPIError,
} from "../../types/services.js";

type ResponsesPayloadOptions = {
  model: string;
  messages: OpenAIMessage[];
  temperature: number;
  maxTokens?: number;
  reasoningEffort?: string;
};

export const ensureResponsesClient = (
  client: OpenAIClient | null,
  serviceName: string
): OpenAIClient => {
  if (!client || !(client as OpenAIClient & { responses?: unknown }).responses) {
    throw new ServiceAPIError(
      "Responses API is not available on this OpenAI client",
      serviceName
    );
  }

  return client;
};

export const formatResponsesInput = (messages: OpenAIMessage[]) =>
  messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));

export const buildResponsesPayload = ({
  model,
  messages,
  temperature,
  maxTokens,
  reasoningEffort,
}: ResponsesPayloadOptions): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    model,
    input: formatResponsesInput(messages),
    temperature,
  };

  if (reasoningEffort) {
    payload.reasoning = { effort: reasoningEffort };
  }

  if (maxTokens) {
    payload.max_output_tokens = maxTokens;
  }

  return payload;
};

export const extractTextFromResponses = (
  response: unknown,
  serviceName: string
): string => {
  if (
    typeof (response as { output_text?: string })?.output_text === "string" &&
    (response as { output_text: string }).output_text.trim().length > 0
  ) {
    return (response as { output_text: string }).output_text.trim();
  }

  if (Array.isArray((response as { output?: unknown[] })?.output)) {
    const parts: string[] = [];
    for (const item of (response as { output: any[] }).output) {
      if (Array.isArray(item?.content)) {
        for (const block of item.content) {
          const text = block?.text || block?.content?.text;
          if (typeof text === "string" && text.trim().length > 0) {
            parts.push(text.trim());
          }
        }
      }
    }
    if (parts.length > 0) {
      return parts.join("\n").trim();
    }
  }

  throw new ServiceAPIError(
    "Invalid API response: missing content",
    serviceName,
    undefined,
    response
  );
};
