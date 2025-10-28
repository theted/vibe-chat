/**
 * Test script for Grok AI service
 *
 * This script demonstrates how to use the Grok AI service to generate responses.
 *
 * Usage:
 * node test-grok.js
 */

import { AIServiceFactory, AI_PROVIDERS } from "@ai-chat/core";
import dotenv from "dotenv";

dotenv.config();

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
    const messages = [
      {
        role: "user",
        content: "Tell me something interesting about space exploration.",
      },
    ];

    console.log("Generating response...");
    const response = await grokService.generateResponse(messages);

    console.log("\nGrok's response:");
    console.log(response);
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

testGrok();
