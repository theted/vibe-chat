/**
 * Cohere Service
 *
 * Integrates Cohere's Chat API via REST (no SDK dependency).
 */

import { BaseAIService } from "./BaseAIService.js";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

export class CohereService extends BaseAIService {
  constructor(config) {
    super(config);
    this.name = "Cohere";
    this.apiKey = null;
    this.apiEndpoint = null;
  }

  async initialize() {
    if (!this.isConfigured()) {
      throw new Error("Cohere API key is not configured");
    }

    this.apiKey = process.env[this.config.provider.apiKeyEnvVar];
    const baseURL =
      process.env.COHERE_BASE_URL?.replace(/\/$/, "") ||
      "https://api.cohere.ai/v1";

    this.apiEndpoint = `${baseURL}/chat`;
  }

  isConfigured() {
    return !!process.env[this.config.provider.apiKeyEnvVar];
  }

  /**
   * Map generic messages to Cohere chat format
   * - System prompts → preamble
   * - History → chat_history (USER/CHATBOT)
   * - Latest user message → message
   */
  static toCoherePayload(messages, model, temperature, defaultPreamble) {
    const sys = messages.filter((m) => m.role === "system").map((m) => m.content);
    const preamble = sys.length > 0 ? sys.join("\n\n") : defaultPreamble;

    // Find index of last user message
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserIdx = i;
        break;
      }
    }

    const message = lastUserIdx >= 0 ? messages[lastUserIdx].content : "";

    // Everything before last user is history
    const history = [];
    for (let i = 0; i < messages.length; i++) {
      if (i === lastUserIdx) continue; // exclude the latest user message
      const m = messages[i];
      if (m.role === "user") {
        history.push({ role: "USER", message: m.content });
      } else if (m.role === "assistant") {
        history.push({ role: "CHATBOT", message: m.content });
      }
      // system messages are represented via preamble, so skip here
    }

    return {
      model,
      preamble,
      message,
      chat_history: history,
      temperature,
      // Pass through, though Cohere may ignore or cap this
      max_tokens: undefined, // Cohere auto-manages by default
    };
  }

  async generateResponse(messages) {
    if (!this.apiKey) {
      await this.initialize();
    }

    try {
      const body = CohereService.toCoherePayload(
        messages,
        this.config.model.id,
        this.config.model.temperature,
        this.config.model.systemPrompt
      );

      const resp = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          // Cohere API version header (commonly required for REST)
          "Cohere-Version": process.env.COHERE_VERSION || "2022-12-06",
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${errText.slice(0, 400)}`);
      }

      const data = await resp.json();

      // Cohere responses may include `text` or `message.content[].text`
      const content =
        data?.text || data?.message?.content?.[0]?.text || data?.output_text;

      if (!content) {
        throw new Error(
          `Cohere API returned an unexpected response format: ${JSON.stringify(
            data
          ).slice(0, 500)}`
        );
      }
      return content;
    } catch (error) {
      console.error(`Cohere API Error: ${error.message}`);
      throw new Error(`Failed to generate response from Cohere: ${error.message}`);
    }
  }
}

