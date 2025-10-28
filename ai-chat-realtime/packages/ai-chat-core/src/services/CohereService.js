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
      "https://api.cohere.ai";

    // Models that require v2 API
    const v2Models = [
      "command-a-reasoning-08-2025"
    ];

    const apiVersion = v2Models.includes(this.config.model.id) ? "v2" : "v1";
    this.apiEndpoint = `${baseURL}/${apiVersion}/chat`;
  }

  isConfigured() {
    return !!process.env[this.config.provider.apiKeyEnvVar];
  }

  /**
   * Map generic messages to Cohere chat format
   * v1: System prompts → preamble, History → chat_history, Latest user message → message
   * v2: All messages → messages array with role mapping
   */
  toCoherePayload(messages, model, temperature, defaultPreamble) {
    // Models that require v2 API
    const v2Models = [
      "command-a-reasoning-08-2025"
    ];
    
    const isV2 = v2Models.includes(model);
    
    if (isV2) {
      // v2 API format: standard OpenAI-style messages array
      const cohereMessages = messages.map(msg => ({
        role: msg.role === "assistant" ? "assistant" : msg.role,
        content: msg.content
      }));
      
      return {
        model,
        messages: cohereMessages,
        temperature,
        max_tokens: this.config.model.maxTokens || 4096
      };
    } else {
      // v1 API format: existing logic
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
  }

  async generateResponse(messages) {
    if (!this.apiKey) {
      await this.initialize();
    }

    try {
      const body = this.toCoherePayload(
        messages,
        this.config.model.id,
        this.config.model.temperature,
        this.getEnhancedSystemPrompt()
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

      // Handle different response formats for v1 vs v2
      let content = null;
      
      // v2 API response format
      if (data?.message?.content) {
        const contentArray = data.message.content;
        // Find text content (skip thinking content)
        const textContent = contentArray.find(item => item.type === 'text');
        content = textContent?.text;
      }
      
      // v1 API response format
      if (!content) {
        content = data?.text || data?.message?.content?.[0]?.text || data?.output_text;
      }

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

