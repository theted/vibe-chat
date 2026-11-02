/**
 * Slash commands typed into the composer. Each runs on the server for the
 * room you're in (see useSlashCommands) and is never posted as a message.
 */

export type SlashCommandName = "clear" | "debug";

export interface SlashCommand {
  name: SlashCommandName;
  description: string;
}

export const SLASH_COMMANDS: readonly SlashCommand[] = [
  {
    name: "clear",
    description: "Clear the chat for everyone and reset the AIs' memory of it",
  },
  {
    name: "debug",
    description: "Show the prompt behind the latest AI reply",
  },
];
