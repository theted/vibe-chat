import { AnimatePresence, motion } from "framer-motion";
import Icon from "./Icon";
import type { ToastContainerProps, ToastType, IconName } from '@/types';

const variants = {
  initial: { opacity: 0, y: 20, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.18, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -16,
    scale: 0.9,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

const typeStyles: Record<ToastType, string> = {
  success:
    "bg-emerald-500/95 text-white border-emerald-300/60 shadow-emerald-500/30",
  info:
    "bg-sky-500/95 text-white border-sky-300/60 shadow-sky-500/30",
  warning:
    "bg-amber-500/95 text-white border-amber-300/60 shadow-amber-500/30",
};

const typeIcon: Record<ToastType, IconName> = {
  success: "sparkle",
  info: "chat",
  warning: "alert",
};

const resolveType = (type: string): ToastType =>
  typeStyles[type as ToastType] ? type as ToastType : "info";

const ToastContainer = ({ toasts }: ToastContainerProps) => (
  <div className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-4 sm:px-0 z-[9999]">
    <div className="flex w-full max-w-md flex-col gap-3">
      <AnimatePresence>
        {toasts.map((toast) => {
          const tone = resolveType(toast.type);
          return (
            <motion.div
              key={toast.id}
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-md ${typeStyles[tone]}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-white/30 p-1">
                  <Icon
                    name={typeIcon[tone] || "sparkle"}
                    className="h-4 w-4 text-white"
                  />
                </div>
                <div className="flex-1 text-sm font-medium leading-relaxed">
                  {toast.message}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  </div>
);

export default ToastContainer;
