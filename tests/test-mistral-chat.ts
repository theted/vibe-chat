import pkg from "@mistralai/mistralai";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  try {
    const apiKey = process.env.MISTRAL_API_KEY;
    console.log("API Key available:", !!apiKey);

    const client = new pkg.Mistral(apiKey);

    // Try to use the chat method
    console.log("Trying to use chat method...");

    // Approach 1: Try to use client.chat as a property with a method
    try {
      console.log("Approach 1: Using client.chat as a property with methods");
      // Check what methods are available on client.chat
      console.log(
        "Methods on client.chat:",
        Object.getOwnPropertyNames(client.chat.__proto__)
      );

      // Try to call a method on client.chat
      const response = await client.chat.post({
        model: "mistral-large-latest",
        messages: [{ role: "user", content: "Hello, how are you?" }],
        max_tokens: 100,
        temperature: 0.7,
      });
      console.log("Response:", response);
    } catch (error) {
      console.error("Error with approach 1:", error.message);
    }

    // Approach 2: Try to use client.models.chat
    try {
      console.log("\nApproach 2: Using client.models.chat");
      // Check what methods are available on client.models
      console.log(
        "Methods on client.models:",
        Object.getOwnPropertyNames(client.models.__proto__)
      );

      // Try to call a method on client.models.chat
      const response = await client.models.chat({
        model: "mistral-large-latest",
        messages: [{ role: "user", content: "Hello, how are you?" }],
        max_tokens: 100,
        temperature: 0.7,
      });
      console.log("Response:", response);
    } catch (error) {
      console.error("Error with approach 2:", error.message);
    }
  } catch (error) {
    console.error("Main error:", error);
  }
}

main();
