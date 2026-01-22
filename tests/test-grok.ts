/**
 * Test script for Grok AI service
 *
 * This script demonstrates how to use the Grok AI service to generate responses.
 *
 * Usage:
 * node test-grok.js
 */

import { AIServiceFactory, AI_PROVIDERS } from "@ai-chat/core";
import type { Message } from "@ai-chat/core";
import dotenv from "dotenv";

dotenv.config();

const unwrapResponse = (response: unknown): string => {
  if (typeof response === "string") {
    return response;
  }
  const typed = response as { content?: string } | null;
  return typeof typed?.content === "string" ? typed.content : "";
};

async function testGrok() {
  try {
    // Create a Grok service instance
    const availableModels = Object.keys(AI_PROVIDERS.GROK.models);
    const modelKey = availableModels[0] || "GROK_3";
    const grokService = AIServiceFactory.createServiceByName("GROK", modelKey);

    // Initialize the service
    await grokService.initialize();

    console.log(`Using model: ${modelKey} (${grokService.getModel()})`);

    // Test with a simple conversation
    const messages: Message[] = [
      {
        role: "user",
        content: "Tell me something interesting about space exploration.",
      },
    ];

    console.log("Generating response...");
    const response = await grokService.generateResponse(messages);
    const responseText = unwrapResponse(response);

    console.log("\nGrok's response:");
    console.log(responseText || response);
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

testGrok();
