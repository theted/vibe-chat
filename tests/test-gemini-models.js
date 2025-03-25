/**
 * Test script to list available Gemini models
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function listModels() {
  try {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.error("Google AI API key is not configured");
      return;
    }

    console.log("Using API key:", apiKey);
    const genAI = new GoogleGenerativeAI(apiKey);

    // Try to list models if the API supports it
    try {
      const models = await genAI.getModels();
      console.log("Available models:", models);
    } catch (error) {
      console.log("Could not list models:", error.message);
    }

    // Try to create a model with different IDs
    const modelIds = [
      "gemini-pro",
      "gemini-1.0-pro",
      "gemini-1.5-pro",
      "gemini-1.5-flash",
    ];

    for (const modelId of modelIds) {
      try {
        console.log(`\nTrying model ID: ${modelId}`);
        const model = genAI.getGenerativeModel({ model: modelId });

        // Try a simple generation to test if the model works
        const result = await model.generateContent("Hello, how are you?");
        const response = await result.response;
        const text = response.text();
        console.log(`Model ${modelId} works! Response: ${text}`);
      } catch (error) {
        console.log(`Error with model ${modelId}:`, error.message);
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
}

listModels();
