/**
 * Test script to list available models from the Grok API
 *
 * This script attempts to list the available models from the Grok API.
 *
 * Usage:
 * node test-grok-models.js
 */

import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

async function listGrokModels() {
  try {
    const apiKey = process.env.GROK_API_KEY;

    if (!apiKey) {
      console.error("GROK_API_KEY is not set in the .env file");
      return;
    }

    console.log("Attempting to list available Grok models...");

    const response = await fetch("https://api.x.ai/v1/models", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Error: ${response.status} - ${JSON.stringify(errorData)}`);
      return;
    }

    const data = await response.json();
    console.log("Available models:");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

listGrokModels();
