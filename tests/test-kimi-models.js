/**
 * List available Kimi (Moonshot) models via OpenAI-compatible API
 * Usage: node tests/test-kimi-models.js
 */

import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

async function listKimiModels() {
  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) {
    console.error("KIMI_API_KEY is not set in the .env file");
    return;
    }

  const baseURL = process.env.KIMI_BASE_URL || "https://api.moonshot.cn/v1";
  const client = new OpenAI({ apiKey, baseURL });

  try {
    const models = await client.models.list();
    console.log("Available Kimi models:");
    for (const m of models.data) {
      console.log(`- ${m.id}`);
    }
  } catch (err) {
    console.error(`Error listing Kimi models: ${err.status || ''} ${err.message}`);
  }
}

listKimiModels();

