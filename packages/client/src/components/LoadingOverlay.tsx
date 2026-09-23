import Spinner from "./Spinner";
import type { LoadingOverlayProps } from "@/types";

const LoadingOverlay = ({
  visible,
  message = "Checking your session",
}: LoadingOverlayProps) => (
  <div
    className={`fixed inset-0 z-50 flex items-center justify-center bg-canvas transition-opacity duration-500 ease-out ${
      visible ? "opacity-100" : "pointer-events-none opacity-0"
    }`}
    aria-hidden={!visible}
  >
    <div
      className="flex flex-col items-center gap-7"
      role="status"
      aria-live="polite"
    >
      <Spinner size="lg" />
      <div className="text-center">
        <p className="wordmark text-2xl">Vibe chat</p>
        <p className="mt-1 text-sm text-muted">{message}</p>
      </div>
    </div>
  </div>
);

export default LoadingOverlay;
