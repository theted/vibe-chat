/**
 * Test script for Gemini models with a philosophical question
 *
 * This script first lists available models, then tests with the latest available model.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function testGeminiModels() {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.error("Google AI API key is not configured");
      return;
    }

    console.log("Initializing Google Generative AI client...");
    const genAI = new GoogleGenerativeAI(apiKey);
    const getModels = async () => {
      const client = genAI as {
        getModels?: () => Promise<{ models?: Array<{ name?: string }> }>;
      };
      return client.getModels ? client.getModels() : null;
    };

    // Try to list available models
    console.log("\nChecking available models...");
    let availableModels = [];
    try {
      const models = await getModels();
      console.log("Available models:", models);
      availableModels =
        models?.models
          ?.map((model) => model.name)
          .filter((name): name is string => Boolean(name)) || [];
    } catch (error) {
      console.log("Could not list models:", error.message);
      // If we can't list models, try some known model IDs
      availableModels = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-pro"];
      console.log("Falling back to testing these models:", availableModels);
    }

    // A deeply philosophical question
    const philosophicalQuestion =
      "What is the nature of consciousness and can artificial intelligence ever truly be conscious?";

    // Try each model until one works
    for (const modelName of availableModels) {
      try {
        console.log(`\nTesting model: ${modelName}`);
        console.log(`Question: ${philosophicalQuestion}`);

        // Extract the model ID from the full name if needed
        const modelId = modelName.includes("/")
          ? modelName.split("/").pop()
          : modelName;

        const model = genAI.getGenerativeModel({ model: modelId });

        // Generate a response
        const result = await model.generateContent(philosophicalQuestion);
        const response = await result.response;
        const text = response.text();

        console.log(`\n${modelId}'s response:`);
        console.log(text);

        // Count sentences to verify the 3-6 sentence limit
        const sentences = text.split(/[.!?]+\s+/);
        console.log(`\nNumber of sentences: ${sentences.length}`);

        // If we got a successful response, we can stop trying models
        break;
      } catch (error) {
        console.error(`Error with model ${modelName}:`, error.message);
        console.log("Trying next model...");
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

testGeminiModels();
