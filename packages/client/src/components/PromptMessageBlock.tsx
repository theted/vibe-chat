/**
 * PromptMessageBlock - one message of a prompt in the /debug viewer: its
 * role and its exact text, whitespace kept.
 */

import type { WirePromptMessage } from "@ai-chat/ai-configs";

const ROLE_CLASSES: Record<WirePromptMessage["role"], string> = {
  system: "text-accent",
  user: "text-muted",
  assistant: "text-fg",
};

interface PromptMessageBlockProps {
  message: WirePromptMessage;
  index: number;
}

const PromptMessageBlock = ({
  message: { role, content },
  index,
}: PromptMessageBlockProps) => (
  <li className="rounded-lg border border-line bg-canvas/60">
    <div className="flex items-center gap-2 border-b border-line px-3 py-1.5 text-xs">
      <span
        className={`font-semibold uppercase tracking-wide ${ROLE_CLASSES[role]}`}
      >
        {role}
      </span>
      <span className="ml-auto tabular-nums text-faint">#{index + 1}</span>
    </div>
    <pre className="whitespace-pre-wrap break-words px-3 py-2 font-mono text-xs leading-relaxed text-fg">
      {content}
    </pre>
  </li>
);

export default PromptMessageBlock;
