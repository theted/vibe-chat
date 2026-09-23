/**
 * MessageAvatar - square tile beside a transcript header: the model's emoji
 * on its voice tint, or a human's initial on a neutral tile.
 */

interface MessageAvatarProps {
  isAI: boolean;
  emoji?: string;
  name: string;
}

const TILE_CLASSES =
  "flex h-9 w-9 items-center justify-center rounded-[10px] select-none";

const MessageAvatar = ({ isAI, emoji, name }: MessageAvatarProps) =>
  isAI ? (
    <div className={`${TILE_CLASSES} bg-voice-soft text-lg`} aria-hidden="true">
      {emoji || "🤖"}
    </div>
  ) : (
    <div
      className={`${TILE_CLASSES} bg-raised font-display text-sm font-bold text-muted`}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );

export default MessageAvatar;
