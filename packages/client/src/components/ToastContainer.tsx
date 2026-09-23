import { AnimatePresence, motion } from "framer-motion";
import Icon from "./Icon";
import type { ToastContainerProps, ToastType, IconName } from "@/types";

const variants = {
  initial: { opacity: 0, y: 12, scale: 0.98 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.18, ease: "easeOut" },
  },
  exit: {
    opacity: 0,
    y: -16,
    scale: 0.98,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

// Only the icon carries the tone; the toast itself stays a quiet surface
const typeStyles: Record<ToastType, string> = {
  success: "text-emerald-400",
  info: "text-muted",
  warning: "text-accent",
};

const typeIcon: Record<ToastType, IconName> = {
  success: "sparkle",
  info: "chat",
  warning: "alert",
};

const resolveType = (type: string): ToastType =>
  typeStyles[type as ToastType] ? (type as ToastType) : "info";

const ToastContainer = ({ toasts }: ToastContainerProps) => (
  <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[9999] flex justify-center px-4">
    <div className="flex w-full max-w-sm flex-col items-center gap-2">
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
              className="pointer-events-auto flex items-center gap-2.5 rounded-lg border border-line bg-raised px-3.5 py-2.5 text-sm text-fg shadow-xl shadow-black/30"
              role="status"
            >
              <Icon
                name={typeIcon[tone] || "sparkle"}
                className={`h-4 w-4 shrink-0 ${typeStyles[tone]}`}
              />
              {toast.message}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  </div>
);

export default ToastContainer;
