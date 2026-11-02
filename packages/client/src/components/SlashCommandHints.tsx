/**
 * SlashCommandHints - the commands matching a half-typed "/" above the
 * composer, each with what it does. Picking one (or Tab) fills it in.
 */

import type { SlashCommand, SlashCommandName } from "@/config/slashCommands";

interface SlashCommandHintsProps {
  commands: SlashCommand[];
  onPick: (name: SlashCommandName) => void;
}

const SlashCommandHints = ({ commands, onPick }: SlashCommandHintsProps) => (
  <ul
    className="mb-2 overflow-hidden rounded-xl border border-line bg-surface shadow-lg shadow-black/20"
    aria-label="Commands"
  >
    {commands.map(({ name, description }) => (
      <li key={name}>
        <button
          type="button"
          onClick={() => onPick(name)}
          className="flex w-full items-baseline gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-raised"
        >
          <span className="font-mono font-semibold text-fg">/{name}</span>
          <span className="truncate text-xs text-muted">{description}</span>
        </button>
      </li>
    ))}
  </ul>
);

export default SlashCommandHints;
