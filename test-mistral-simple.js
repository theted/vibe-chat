import pkg from "@mistralai/mistralai";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  try {
    const apiKey = process.env.MISTRAL_API_KEY;
    console.log("API Key available:", !!apiKey);

    const client = new pkg.Mistral(apiKey);

    // Log the client object structure
    console.log("Client object:", client);

    // Log the client methods
    console.log(
      "Client methods:",
      Object.getOwnPropertyNames(client.__proto__)
    );

    // Log the client properties
    console.log("Client properties:", Object.keys(client));

    // Try to access the chat property
    if (client.chat) {
      console.log("Chat property exists");
      console.log("Chat property type:", typeof client.chat);
      console.log("Chat property keys:", Object.keys(client.chat));
    }

    // Try to access the models property
    if (client.models) {
      console.log("Models property exists");
      console.log("Models property type:", typeof client.models);
      console.log("Models property keys:", Object.keys(client.models));
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
