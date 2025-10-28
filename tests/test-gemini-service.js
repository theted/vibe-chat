/**
 * Test script for GeminiService with a philosophical question
 *
 * This script tests the GeminiService implementation with the configured models,
 * including the sentence limiting functionality.
 */

import { GeminiService, AI_PROVIDERS } from "@ai-chat/core";
import dotenv from "dotenv";

dotenv.config();

async function testGeminiService() {
  try {
    // Get the Gemini provider configuration
    const geminiProvider = AI_PROVIDERS.GEMINI;

    // Test each configured Gemini model
    for (const modelKey in geminiProvider.models) {
      const modelConfig = geminiProvider.models[modelKey];
      console.log(`\nTesting ${modelKey} (${modelConfig.id})...`);

      // Create a configuration object for the service
      const config = {
        provider: geminiProvider,
        model: modelConfig,
      };

      // Create a new GeminiService instance
      const geminiService = new GeminiService(config);

      // Check if the service is configured
      if (!geminiService.isConfigured()) {
        console.log(
          "Gemini service is not configured. Make sure GOOGLE_AI_API_KEY is set in .env"
        );
        continue;
      }

      // Initialize the service
      await geminiService.initialize();

      // A deeply philosophical question
      const philosophicalQuestion =
        "What is the nature of consciousness and can artificial intelligence ever truly be conscious?";

      console.log(`Question: ${philosophicalQuestion}`);

      // Create a message array with the question
      const messages = [
        { role: "system", content: modelConfig.systemPrompt },
        { role: "user", content: philosophicalQuestion },
      ];

      // Generate a response
      const response = await geminiService.generateResponse(messages);

      console.log(`\nResponse from ${modelKey}:`);
      console.log(response);

      // Count sentences to verify the 3-6 sentence limit
      const sentences = response.split(/[.!?]+\s+/);
      console.log(`Number of sentences: ${sentences.length}`);

      // Check if the response length is within the expected range
      if (sentences.length >= 3 && sentences.length <= 6) {
        console.log(
          "✅ Response length is within the expected range (3-6 sentences)"
        );
      } else {
        console.log(
          "❌ Response length is outside the expected range (3-6 sentences)"
        );
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testGeminiService();
