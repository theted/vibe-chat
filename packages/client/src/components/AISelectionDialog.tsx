/**
 * AISelectionDialog Component - Modal for selecting AI to mention
 * Two-step flow: list → detail → confirm insert.
 * Enter/click on a result opens the detail view; Enter/button from detail inserts.
 * Capture-phase keyboard listener prevents Enter from propagating to the form.
 * Search/ranking lives in useAISearch; the detail card is AIDetailPreview.
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAISearch } from "@/hooks/useAISearch";
import { DIALOG_SPRING } from "@/config/dialogAnimations";
import AIDetailPreview from "./AIDetailPreview";
import AIMentionList from "./AIMentionList";
import type { MentionOption } from "@/utils/aiSearch";
import type { AISelectionDialogProps, DialogPosition } from "@/types";

const DIALOG_Y_OFFSET = 10;

const AISelectionDialog = ({
  isOpen,
  onClose,
  onSelect,
  searchTerm = "",
  position,
}: AISelectionDialogProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedItem, setSelectedItem] = useState<MentionOption | null>(null);

  const { filteredAIs, normalizedTerm, isLoading } = useAISearch(searchTerm);

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setView("list");
      setSelectedItem(null);
      setActiveIndex(0);
    }
  }, [isOpen]);

  // Return to list when search term changes while detail is open
  useEffect(() => {
    if (view === "detail" && normalizedTerm) {
      setView("list");
      setSelectedItem(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedTerm]);

  useEffect(() => {
    if (isOpen) setActiveIndex(0);
  }, [isOpen, filteredAIs.length]);

  const openDetail = (item: MentionOption) => {
    setSelectedItem(item);
    setView("detail");
  };

  const confirmSelect = () => {
    if (selectedItem) {
      onSelect(selectedItem.name);
      setView("list");
      setSelectedItem(null);
    }
  };

  // Keyboard handler — capture phase so Enter never leaks to the form
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (view === "detail") { setView("list"); setSelectedItem(null); }
        else onClose();
        return;
      }

      if (view === "list") {
        if (e.key === "ArrowDown" && filteredAIs.length > 0) {
          e.preventDefault(); e.stopPropagation();
          setActiveIndex((p) => (p + 1) % filteredAIs.length);
        } else if (e.key === "ArrowUp" && filteredAIs.length > 0) {
          e.preventDefault(); e.stopPropagation();
          setActiveIndex((p) => (p - 1 + filteredAIs.length) % filteredAIs.length);
        } else if (e.key === "Enter" && filteredAIs.length > 0) {
          e.preventDefault(); e.stopPropagation();
          const item = filteredAIs[activeIndex] ?? filteredAIs[0];
          if (item) openDetail(item);
        }
      } else if (view === "detail") {
        if (e.key === "Enter") {
          e.preventDefault(); e.stopPropagation();
          confirmSelect();
        }
      }
    };

    // Capture phase — runs before React synthetic events on textarea
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, filteredAIs, isOpen, view, selectedItem]);

  // Click outside
  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [isOpen, onClose]);

  const safePos = useMemo<DialogPosition>(() => {
    if (position && typeof position.x === "number" && typeof position.y === "number") return position;
    if (typeof window !== "undefined") return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    return { x: 0, y: 0 };
  }, [position]);

  // Portal to <body>: the dialog is positioned with viewport coords from
  // getBoundingClientRect, but its mount point lives inside the chat surface,
  // which uses backdrop-blur (a containing block for position: fixed) plus
  // overflow-hidden. Rendered in place, the dialog is repositioned relative to
  // that box and clipped out of view. A body portal escapes both.
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dialogRef}
          className="fixed z-[9999] bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/80 w-80 dark:bg-slate-900/95 dark:border-slate-700 dark:text-slate-100 overflow-hidden"
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.97 }}
          transition={DIALOG_SPRING}
          style={{
            left: safePos.x,
            top: safePos.y - DIALOG_Y_OFFSET,
            transform: "translateY(-100%)",
          }}
        >
          <AnimatePresence mode="wait">
            {view === "list" ? (
              <AIMentionList
                key="list"
                filteredAIs={filteredAIs}
                normalizedTerm={normalizedTerm}
                searchTerm={searchTerm}
                isLoading={isLoading}
                activeIndex={activeIndex}
                onActiveIndexChange={setActiveIndex}
                onOpenDetail={openDetail}
              />
            ) : (
              selectedItem && (
                <AIDetailPreview
                  key="detail"
                  item={selectedItem}
                  onBack={() => { setView("list"); setSelectedItem(null); }}
                  onConfirm={confirmSelect}
                />
              )
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default AISelectionDialog;
