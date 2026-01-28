import pkg from "@mistralai/mistralai";
import dotenv from "dotenv";

dotenv.config();

// Log the package structure to see what's available
console.log("Mistral package:", Object.keys(pkg));

// Try to initialize the client
try {
  const apiKey = process.env.MISTRAL_API_KEY;
  console.log("API Key available:", !!apiKey);

  // Try different ways to initialize the client
  if (pkg.Mistral) {
    console.log("Using Mistral constructor");
    const client = new pkg.Mistral(apiKey);
    console.log("Client initialized successfully");
    console.log(
      "Client methods:",
      Object.getOwnPropertyNames(client.__proto__)
    );

    // Try to use the chat method directly
    try {
      console.log("Trying different approaches to generate chat...");

      // Approach 1: Try to call chat directly as a method
      if (typeof client.chat === "function") {
        console.log(
          "Approach 1: client.chat is a function, trying to call it..."
        );
        const response = await client.chat({
          model: "mistral-large-latest",
          messages: [{ role: "user", content: "Hello, how are you?" }],
          max_tokens: 100,
          temperature: 0.7,
        });
        console.log("Response:", response);
      } else {
        console.log("Approach 1: client.chat is not a function");
      }

      // Approach 2: Try to use client.models.generate
      if (client.models && typeof client.models.generate === "function") {
        console.log("Approach 2: Trying client.models.generate...");
        const response = await client.models.generate({
          model: "mistral-large-latest",
          messages: [{ role: "user", content: "Hello, how are you?" }],
          max_tokens: 100,
          temperature: 0.7,
        });
        console.log("Response:", response);
      } else {
        console.log("Approach 2: client.models.generate is not available");
      }

      // Approach 3: Try to use client.chat.completions.create (OpenAI-like)
      if (
        client.chat &&
        client.chat.completions &&
        typeof client.chat.completions.create === "function"
      ) {
        console.log("Approach 3: Trying client.chat.completions.create...");
        const response = await client.chat.completions.create({
          model: "mistral-large-latest",
          messages: [{ role: "user", content: "Hello, how are you?" }],
          max_tokens: 100,
          temperature: 0.7,
        });
        console.log("Response:", response);
      } else {
        console.log(
          "Approach 3: client.chat.completions.create is not available"
        );
      }
    } catch (e) {
      console.error("Error checking chat method:", e);
    }
  } else if (typeof pkg === "function") {
    console.log("Using pkg as constructor");
    const client = new pkg(apiKey);
    console.log("Client initialized successfully");
  } else {
    console.log("Could not find Mistral constructor");
  }
} catch (error) {
  console.error("Error initializing Mistral client:", error);
}
