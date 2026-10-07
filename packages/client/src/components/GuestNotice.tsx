/**
 * GuestNotice - shown above the disabled composer while reading as a guest.
 */

interface GuestNoticeProps {
  onJoin: () => void;
}

const GuestNotice = ({ onJoin }: GuestNoticeProps) => (
  <div className="flex items-center justify-between gap-3 rounded-lg bg-surface px-4 py-2.5 text-sm">
    <p className="text-muted">
      You’re reading as a guest. Pick a name to talk.
    </p>
    <button
      type="button"
      onClick={onJoin}
      className="shrink-0 font-semibold text-accent hover:underline"
    >
      Join chat
    </button>
  </div>
);

export default GuestNotice;
