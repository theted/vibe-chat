/**
 * useToasts Hook - Manages toast notification lifecycle (auto-dismiss, cleanup)
 */

import { useState, useCallback, useRef, useEffect } from "react";
import type { Toast, ToastType } from "@/types";

const TOAST_DURATION_MS = 3_500;

export const useToasts = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(
    () => () => {
      timeouts.current.forEach((id) => { clearTimeout(id); });
      timeouts.current.clear();
    },
    [],
  );

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    const timeout = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      timeouts.current.delete(id);
    }, TOAST_DURATION_MS);

    timeouts.current.set(id, timeout);
  }, []);

  return { toasts, showToast };
};
