import pkg from "@mistralai/mistralai";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  try {
    const apiKey = process.env.MISTRAL_API_KEY;
    console.log("API Key available:", !!apiKey);

    const client = new pkg.Mistral(apiKey);

    // Try to use the chat.complete method
    console.log("Trying to use chat.complete method...");

    try {
      const response = await client.chat.complete({
        model: "mistral-large-latest",
        messages: [{ role: "user", content: "Hello, how are you?" }],
        max_tokens: 100,
        temperature: 0.7,
      });
      console.log("Response:", response);
    } catch (error) {
      console.error("Error with chat.complete:", error);
    }
  } catch (error) {
    console.error("Main error:", error);
  }
}

main();
