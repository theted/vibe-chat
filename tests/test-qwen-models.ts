/**
 * List available Qwen (DashScope) models via OpenAI-compatible API
 * Usage: node tests/test-qwen-models.js
 */

import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

async function listQwenModels() {
  const apiKey = process.env.QWEN_API_KEY;
  if (!apiKey) {
    console.error("QWEN_API_KEY is not set in the .env file");
    return;
  }

  const baseURL =
    process.env.QWEN_BASE_URL ||
    process.env.QWEN_OPENAI_BASE_URL ||
    "https://dashscope.aliyuncs.com/compatible-mode/v1";
  const client = new OpenAI({ apiKey, baseURL });

  try {
    const models = await client.models.list();
    console.log("Available Qwen models:");
    for (const m of models.data) {
      console.log(`- ${m.id}`);
    }
  } catch (err) {
    console.error(
      `Error listing Qwen models: ${err.status || ''} ${err.message} (baseURL: ${baseURL})`
    );
  }
}

listQwenModels();

