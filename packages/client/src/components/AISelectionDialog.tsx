/**
 * AISelectionDialog Component - Modal for selecting AI to mention
 * Enter, Tab or a click on a result inserts the mention in one step. The model
 * detail card stays reachable (ArrowRight or the row's info button) without
 * slowing down that main path; Enter on the card inserts too.
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
/** Matches the dialog's `w-80` class; used to keep it inside the viewport. */
const DIALOG_WIDTH = 320;
const VIEWPORT_MARGIN = 8;
/** Keys that insert the highlighted mention straight from the list. */
const SELECT_KEYS = new Set(["Enter", "Tab"]);

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

  const { filteredAIs, normalizedTerm } = useAISearch(searchTerm);

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setView("list");
      setSelectedItem(null);
      setActiveIndex(0);
    }
  }, [isOpen]);

  // Typing a new term abandons whatever detail card was open. Tracking the
  // previous term keeps `view` out of the dependency list — including it would
  // reset the detail view the instant it opened.
  const lastTermRef = useRef(normalizedTerm);
  useEffect(() => {
    if (lastTermRef.current === normalizedTerm) return;
    lastTermRef.current = normalizedTerm;
    setView("list");
    setSelectedItem(null);
  }, [normalizedTerm]);

  useEffect(() => {
    if (isOpen) setActiveIndex(0);
  }, [isOpen, filteredAIs.length]);

  const openDetail = (item: MentionOption) => {
    setSelectedItem(item);
    setView("detail");
  };

  const closeDetail = () => {
    setView("list");
    setSelectedItem(null);
  };

  const selectItem = (item: MentionOption) => {
    onSelect(item.name);
    closeDetail();
  };

  const confirmSelect = () => {
    if (selectedItem) selectItem(selectedItem);
  };

  // Keyboard handler — capture phase so Enter never leaks to the form.
  // The listener is registered once and reads the current handler through a
  // ref; binding it directly would re-subscribe on every keystroke, since
  // filteredAIs and activeIndex change as the user types.
  const handleKeyRef = useRef<(event: KeyboardEvent) => void>(() => {});
  handleKeyRef.current = (e: KeyboardEvent) => {
    if (!isOpen) return;

    const stop = () => {
      e.preventDefault();
      e.stopPropagation();
    };

    if (e.key === "Escape") {
      stop();
      if (view === "detail") {
        closeDetail();
      } else {
        onClose();
      }
      return;
    }

    if (view === "detail") {
      if (e.key === "Enter" || e.key === "Tab") {
        stop();
        confirmSelect();
      } else if (e.key === "ArrowLeft") {
        stop();
        closeDetail();
      }
      return;
    }

    if (filteredAIs.length === 0) return;

    if (e.key === "ArrowDown") {
      stop();
      setActiveIndex((p) => (p + 1) % filteredAIs.length);
    } else if (e.key === "ArrowUp") {
      stop();
      setActiveIndex((p) => (p - 1 + filteredAIs.length) % filteredAIs.length);
    } else if (SELECT_KEYS.has(e.key)) {
      // Shift+Tab keeps its usual focus-backwards meaning
      if (e.key === "Tab" && e.shiftKey) return;
      // preventDefault on keydown also cancels the keypress the composer
      // listens to for Enter-to-send, so this Enter only inserts the mention
      stop();
      const item = filteredAIs[activeIndex] ?? filteredAIs[0];
      if (item) selectItem(item);
    } else if (e.key === "ArrowRight") {
      stop();
      const item = filteredAIs[activeIndex] ?? filteredAIs[0];
      if (item) openDetail(item);
    }
  };

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handleKeyRef.current(event);
    document.addEventListener("keydown", listener, true);
    return () => document.removeEventListener("keydown", listener, true);
  }, []);

  // A spaced term that matches nothing is ordinary prose rather than a mention
  // in progress, so get the empty list out of the way instead of hovering it
  // over the input until the word cap is hit.
  useEffect(() => {
    if (!isOpen) return;
    if (normalizedTerm.includes(" ") && filteredAIs.length === 0) onClose();
  }, [filteredAIs.length, isOpen, normalizedTerm, onClose]);

  // Click outside
  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(e.target as Node))
        onClose();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [isOpen, onClose]);

  const safePos = useMemo<DialogPosition>(() => {
    if (
      position &&
      typeof position.x === "number" &&
      typeof position.y === "number"
    )
      return position;
    if (typeof window !== "undefined")
      return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    return { x: 0, y: 0 };
  }, [position]);

  /**
   * The dialog opens upward from the input, so it is anchored by `bottom`
   * rather than `top` + translateY(-100%): framer-motion owns `transform` for
   * the open/close animation and resets it to `none` when the animation ends,
   * which silently dropped the translate and pushed the list off-screen.
   * `left` is clamped so a dialog near the right edge stays reachable.
   */
  const anchorStyle = useMemo(() => {
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
    const viewportHeight =
      typeof window !== "undefined" ? window.innerHeight : 0;
    const maxLeft = Math.max(
      VIEWPORT_MARGIN,
      viewportWidth - DIALOG_WIDTH - VIEWPORT_MARGIN,
    );

    return {
      left: Math.min(Math.max(safePos.x, VIEWPORT_MARGIN), maxLeft),
      bottom: Math.max(
        VIEWPORT_MARGIN,
        viewportHeight - safePos.y + DIALOG_Y_OFFSET,
      ),
    };
  }, [safePos.x, safePos.y]);

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
          className="fixed z-[9999] w-80 overflow-hidden rounded-xl border border-line bg-raised text-fg shadow-2xl shadow-black/40"
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.97 }}
          transition={DIALOG_SPRING}
          style={anchorStyle}
        >
          <AnimatePresence mode="wait">
            {view === "list" ? (
              <AIMentionList
                key="list"
                filteredAIs={filteredAIs}
                normalizedTerm={normalizedTerm}
                searchTerm={searchTerm}
                activeIndex={activeIndex}
                onActiveIndexChange={setActiveIndex}
                onSelect={selectItem}
                onOpenDetail={openDetail}
              />
            ) : (
              selectedItem && (
                <AIDetailPreview
                  key="detail"
                  item={selectedItem}
                  onBack={closeDetail}
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
