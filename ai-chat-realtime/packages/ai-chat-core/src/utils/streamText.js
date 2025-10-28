/**
 * Utility functions for streaming text to the console
 */

import readline from "readline";

/**
 * Stream text to the console with a delay between words
 * @param {string} text - The text to stream
 * @param {string} prefix - Prefix to add before the text (e.g., "[AI Name]: ")
 * @param {number} wordDelayMs - Delay between words in milliseconds
 * @returns {Promise<void>} Promise that resolves when streaming is complete
 */
export const streamText = async (text, prefix = "", wordDelayMs = 30) => {
  // Create a readline interface to control the console output
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  // Print the prefix without a newline
  process.stdout.write(prefix);

  // Split the text into words and stream them with a delay
  const words = text.split(/\s+/);

  for (let i = 0; i < words.length; i++) {
    process.stdout.write(words[i]);
    if (i < words.length - 1) process.stdout.write(" ");
    await new Promise((resolve) => setTimeout(resolve, wordDelayMs));
  }

  // Add a newline at the end
  process.stdout.write("\n");

  // Close the readline interface
  rl.close();
};
