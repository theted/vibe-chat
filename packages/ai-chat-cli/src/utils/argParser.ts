/**
 * CLI Argument Parser
 * Handles parsing of command line arguments for the Vibe chat CLI
 */

import { AI_PROVIDERS } from "@ai-chat/core";
import {
  DEFAULT_TOPIC,
  CLI_ALIASES,
  USAGE_LINES,
  DEFAULT_MAX_TURNS,
  DEFAULT_ADDITIONAL_TURNS,
} from "../config/constants.js";
import type { ParticipantConfig, ParsedArgs } from "../types/cli.js";

/**
 * Normalize provider input using aliases
 */
export const normalizeProviderInput = (providerName: string): string =>
  CLI_ALIASES[providerName.toLowerCase()] || providerName.toLowerCase();

/**
 * Display usage instructions and supported models
 */
export const displayUsage = (): void => {
  USAGE_LINES.forEach((l) => console.log(l));

  console.log("\nSupported providers and models:");
  Object.entries(AI_PROVIDERS).forEach(([providerKey, provider]) => {
    console.log(`\n${provider.name} (${providerKey.toLowerCase()}):`);
    Object.entries(provider.models).forEach(([modelKey, model]) => {
      console.log(`  - ${modelKey} (${model.id})`);
    });
  });

  console.log("\nEnvironment variables required in .env file:");
  Object.values(AI_PROVIDERS).forEach((provider) => {
    console.log(`  - ${provider.apiKeyEnvVar} (for ${provider.name})`);
  });
};

/**
 * Parse participant string which may include model specification
 */
export const parseParticipant = (participantStr: string): ParticipantConfig => {
  const parts = participantStr.split(":");
  const rawProvider = parts[0].toLowerCase();

  // If no colon, check if this might be a model name instead of provider name
  if (parts.length === 1) {
    const modelName = participantStr.toUpperCase();

    // Search for this model across all providers
    for (const [providerKey, providerConfig] of Object.entries(AI_PROVIDERS)) {
      if (providerConfig.models[modelName]) {
        return {
          provider: providerKey.toLowerCase(),
          model: modelName,
        };
      }
    }

    // If not found as a model, treat as provider name
    return {
      provider: normalizeProviderInput(rawProvider),
      model: null,
    };
  }

  return {
    provider: normalizeProviderInput(rawProvider),
    model: parts[1].toUpperCase(),
  };
};

/**
 * Parse positional command line arguments
 */
const parsePositionalArgs = (args: string[], result: ParsedArgs): void => {
  // Find the index of the first argument that doesn't look like a participant
  let topicIndex = args.findIndex((arg) => {
    // If it contains a colon, it's definitely a participant (provider:model)
    if (arg.includes(":")) return false;

    // Check if it's a known model name across all providers
    const upperArg = arg.toUpperCase();
    for (const providerConfig of Object.values(AI_PROVIDERS)) {
      if (providerConfig.models[upperArg]) return false;
    }

    // Check if it's a known provider name
    const lowerArg = arg.toLowerCase();
    const providerNames = Object.keys(AI_PROVIDERS).map((k) => k.toLowerCase());
    const aliasNames = Object.keys(CLI_ALIASES);
    if (providerNames.includes(lowerArg) || aliasNames.includes(lowerArg))
      return false;

    // If it's not a known model or provider, it's likely the start of the topic
    return true;
  });

  // If no topic found, assume all args are participants
  if (topicIndex === -1) {
    topicIndex = args.length;
    result.topic = "Discuss this topic in an interesting way.";
  } else {
    // Check if the last argument is a number (maxTurns)
    const lastArg = args[args.length - 1];
    if (/^\d+$/.test(lastArg)) {
      result.maxTurns = parseInt(lastArg, 10);
      result.topic = args.slice(topicIndex, args.length - 1).join(" ");
    } else {
      result.topic = args.slice(topicIndex).join(" ");
    }
  }

  // Parse participants
  for (let i = 0; i < topicIndex; i++) {
    result.participants.push(parseParticipant(args[i]));
  }

  // Determine mode based on participant count
  if (result.participants.length > 2) {
    result.singlePromptMode = true;
  } else if (result.participants.length === 2) {
    result.singlePromptMode = false;
  } else if (result.participants.length === 1) {
    result.singlePromptMode = true;
  } else {
    result.participants = [
      { provider: "openai", model: null },
      { provider: "anthropic", model: null },
    ];
    result.singlePromptMode = false;
  }
};

/**
 * Parse named command line arguments (--flag style)
 */
const parseNamedArgs = (args: string[], result: ParsedArgs): void => {
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--participant" && i + 1 < args.length) {
      result.participants.push(parseParticipant(args[++i]));
    } else if (arg === "--topic" && i + 1 < args.length) {
      result.topic = args[++i];
    } else if (arg === "--maxTurns" && i + 1 < args.length) {
      result.maxTurns = parseInt(args[++i], 10) || DEFAULT_MAX_TURNS;
    } else if (arg === "--singlePromptMode") {
      result.singlePromptMode = true;
    }
  }

  // If no participants specified, use defaults
  if (result.participants.length === 0) {
    result.participants = [
      { provider: "openai", model: null },
      { provider: "anthropic", model: null },
    ];
  }
};

/**
 * Parse continue command arguments
 */
const parseContinueCommand = (args: string[], result: ParsedArgs): boolean => {
  if (args[0].toLowerCase() !== "continue") {
    return false;
  }

  if (args.length < 2) {
    console.error(
      "Usage: npm start continue <conversation-file> [provider[:MODEL] ...] [additionalTurns]",
    );
    return true; // Indicates continue command was attempted but failed
  }

  result.command = "continue";
  result.conversationFile = args[1];
  result.participants = [];

  let endIndex = args.length;
  const lastArg = args[args.length - 1];

  if (lastArg && /^\d+$/.test(lastArg)) {
    result.additionalTurns = parseInt(lastArg, 10);
    endIndex -= 1;
  }

  for (let i = 2; i < endIndex; i++) {
    result.participants.push(parseParticipant(args[i]));
  }

  if (!result.additionalTurns) {
    result.additionalTurns = DEFAULT_ADDITIONAL_TURNS;
  }

  return true;
};

/**
 * Parse command line arguments
 */
export const parseArgs = (): ParsedArgs | null => {
  const args = process.argv.slice(2);
  const result: ParsedArgs = {
    participants: [],
    topic: DEFAULT_TOPIC,
    maxTurns: DEFAULT_MAX_TURNS,
    singlePromptMode: false,
    command: "start",
  };

  // If no arguments provided, display usage and return null
  if (args.length === 0) {
    displayUsage();
    return null;
  }

  // Handle "continue" command
  if (parseContinueCommand(args, result)) {
    return result.command === "continue" ? result : null;
  }

  // Check argument style
  if (args.length > 0 && !args[0].startsWith("--")) {
    parsePositionalArgs(args, result);
  } else {
    parseNamedArgs(args, result);
  }

  return result;
};
