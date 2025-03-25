/**
 * Test script for Grok AI service
 *
 * This script demonstrates how to use the Grok AI service to generate responses.
 *
 * Usage:
 * node test-grok.js
 */

import { AIServiceFactory } from "./src/services/AIServiceFactory.js";
import { AI_PROVIDERS } from "./src/config/aiProviders.js";
import dotenv from "dotenv";

dotenv.config();

async function testGrok() {
  try {
    // Create a Grok service instance
    const grokService = AIServiceFactory.createServiceByName("GROK", "GROK_1");

    // Initialize the service
    await grokService.initialize();

    console.log(`Using model: ${grokService.getModel()}`);

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
