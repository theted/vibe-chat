import type { LoadingOverlayProps } from '@/types';

const LoadingOverlay = ({ visible, message = "Checking your session..." }: LoadingOverlayProps) => {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-primary-100 dark:from-slate-950 dark:via-slate-950/95 dark:to-slate-900 transition-opacity duration-[800ms] ease-out ${
        visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
      aria-hidden={!visible}
    >
      <div
        className={`flex flex-col items-center gap-6 transition-all duration-[800ms] ease-out ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
        role="status"
        aria-live="polite"
      >
        <div className="relative h-24 w-24">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary-500 via-cyan-400 to-rose-500 opacity-70 blur-md animate-pulse"></div>
          <div className="absolute inset-1.5 rounded-full bg-white/60 dark:bg-slate-900/80 shadow-inner"></div>
          <div className="absolute inset-2 rounded-full border border-white/60 dark:border-slate-800/70 backdrop-blur-sm"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 border-l-rose-400 animate-spin [animation-duration:1.2s]"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-b-cyan-400 border-r-primary-400 animate-[spin_1.8s_linear_infinite] opacity-60"></div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-slate-700 dark:text-slate-200 tracking-wide animate-pulse-soft [animation-duration:2600ms]">
            {message}
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 animate-pulse-soft [animation-duration:3200ms]">
            Preparing your AI chat experience...
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
