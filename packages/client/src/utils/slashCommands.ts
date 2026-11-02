import {
  SLASH_COMMANDS,
  type SlashCommand,
  type SlashCommandName,
} from "@/config/slashCommands";

// "/word" then whitespace or the end: "/r/programming is fun" stays a message
const COMMAND_PATTERN = /^\/([a-z]+)(?:\s|$)/i;
// Typing "/" and the start of a name, before any space
const PARTIAL_COMMAND_PATTERN = /^\/([a-z]*)$/i;

export type ParsedSlashCommand =
  | { kind: "known"; name: SlashCommandName }
  | { kind: "unknown"; name: string };

/** The command a message runs, or null when it's an ordinary message. */
export const parseSlashCommand = (
  content: string,
): ParsedSlashCommand | null => {
  const match = content.trim().match(COMMAND_PATTERN);
  if (!match) return null;
  const name = match[1].toLowerCase();
  const command = SLASH_COMMANDS.find((candidate) => candidate.name === name);
  return command
    ? { kind: "known", name: command.name }
    : { kind: "unknown", name };
};

/** Commands matching a half-typed "/cl", for the composer's hints. */
export const matchSlashCommands = (draft: string): SlashCommand[] => {
  const match = draft.match(PARTIAL_COMMAND_PATTERN);
  if (!match) return [];
  const prefix = match[1].toLowerCase();
  return SLASH_COMMANDS.filter(({ name }) => name.startsWith(prefix));
};

export const formatCommandList = (): string =>
  SLASH_COMMANDS.map(({ name }) => `/${name}`).join(" or ");
