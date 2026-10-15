/**
 * MessageMixBar - one stacked bar splitting all messages into AI and people,
 * coloured the same way the chat colours models (violet) and you (amber).
 */

import { getPercentage } from "@/utils/formatters";

interface MessageMixBarProps {
  aiMessages: number;
  userMessages: number;
}

const AI_COLOUR = "oklch(var(--voice-l) var(--voice-c) 290)";
const AI_SWATCH_STYLE = { background: AI_COLOUR };

const MessageMixBar = ({ aiMessages, userMessages }: MessageMixBarProps) => {
  const total = aiMessages + userMessages;
  const aiShare = getPercentage(aiMessages, total);
  const userShare = total > 0 ? 100 - aiShare : 0;

  return (
    <div>
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-raised"
        role="img"
        aria-label={`${aiShare}% of messages from AI, ${userShare}% from people`}
      >
        <div
          className="h-full transition-[width] duration-500"
          style={{ width: `${aiShare}%`, background: AI_COLOUR }}
        />
        <div
          className="h-full bg-accent transition-[width] duration-500"
          style={{ width: `${userShare}%` }}
        />
      </div>
      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={AI_SWATCH_STYLE} />
          <dt className="text-muted">AI</dt>
          <dd className="tabular-nums text-fg">
            {aiMessages.toLocaleString()} ({aiShare}%)
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-accent" />
          <dt className="text-muted">People</dt>
          <dd className="tabular-nums text-fg">
            {userMessages.toLocaleString()} ({userShare}%)
          </dd>
        </div>
      </dl>
    </div>
  );
};

export default MessageMixBar;
