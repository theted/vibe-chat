/**
 * AI Chat - Main Entry Point
 *
 * This file demonstrates how to use the conversation manager to start
 * a conversation between different AI services.
 */

import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { CLIOrchestratorAdapter } from "./conversation/CLIOrchestratorAdapter.js";
import { ChatMCPAssistant } from "./services/ChatMCPAssistant.js";
import { DEFAULT_ADDITIONAL_TURNS } from "./config/constants.js";
import { parseArgs } from "./utils/argParser.js";
import { toMessages } from "./types/cli.js";
import {
  startAIConversation,
  getSinglePromptResponses,
  continueConversationFromFile,
} from "./handlers/conversationHandlers.js";

// Load environment variables
dotenv.config();

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = moduleDir;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Create orchestrator adapter with optional MCP assistant
 */
const createOrchestratorAdapter = async (
  config: { maxTurns?: number; timeoutMs?: number } = {},
): Promise<CLIOrchestratorAdapter> => {
  const chatAssistant = new ChatMCPAssistant({
    mentionName: "Chat",
    projectRoot,
  });

  // Use 'any' to avoid type conflicts between different InternalResponder definitions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const responders: any[] = [];

  try {
    await chatAssistant.initialise();
    responders.push(chatAssistant);
  } catch (error: unknown) {
    console.error(
      `Warning: Chat assistant initialisation failed (${getErrorMessage(error)}).`,
    );
  }

  return new CLIOrchestratorAdapter({
    ...config,
    internalResponders: responders,
  });
};

/**
 * Main function
 */
const main = async () => {
  const options = parseArgs();
  if (!options) return;

  if (options.command === "continue") {
    if (!options.conversationFile) {
      console.error("Error: conversationFile is required for continue command");
      return;
    }
    await continueConversationFromFile(
      {
        conversationFile: options.conversationFile,
        participants: options.participants,
        additionalTurns: options.additionalTurns || DEFAULT_ADDITIONAL_TURNS,
      },
      createOrchestratorAdapter,
      toMessages,
    );
    return;
  }

  if (options.singlePromptMode) {
    await getSinglePromptResponses(options, toMessages);
  } else {
    const conversationManager = await createOrchestratorAdapter({
      maxTurns: options.maxTurns,
    });
    await startAIConversation(options, conversationManager, toMessages);
  }
};

// Run the main function
main().catch(console.error);
