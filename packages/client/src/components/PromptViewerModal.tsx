/**
 * PromptViewerModal - /debug: the prompt behind the room's latest AI reply,
 * message by message as the model's service received it, with the reply it
 * produced.
 */

import { useEffect, useState } from "react";
import type { WirePromptRecord } from "@ai-chat/ai-configs";
import {
  MODAL_BACKDROP_CLASSES,
  MODAL_CLOSE_BUTTON_CLASSES,
  MODAL_PANEL_CLASSES,
  MODAL_TITLE_CLASSES,
  modalPanelState,
} from "@/constants/modalStyles";
import { formatMessageTime } from "@/utils/formatters";
import Icon from "./Icon";
import PromptMessageBlock from "./PromptMessageBlock";

const COPY_FEEDBACK_MS = 2_000;
const JSON_INDENT = 2;

interface PromptViewerModalProps {
  prompt: WirePromptRecord | null;
  isOpen: boolean;
  isVisible: boolean;
  onClose: () => void;
}

const PromptViewerModal = ({
  prompt,
  isOpen,
  isVisible,
  onClose,
}: PromptViewerModalProps) => {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!isCopied) return undefined;
    const timer = window.setTimeout(() => setIsCopied(false), COPY_FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [isCopied]);

  if (!isVisible || !prompt) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(prompt.messages, null, JSON_INDENT),
      );
      setIsCopied(true);
    } catch (error) {
      console.error("Copying the prompt failed:", error);
    }
  };

  const details = [
    prompt.modelId,
    formatMessageTime(prompt.createdAt),
    `${prompt.messages.length} messages`,
  ].filter(Boolean);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isOpen ? "pointer-events-auto" : "pointer-events-none"
      }`}
    >
      <div
        className={`${MODAL_BACKDROP_CLASSES} ${isOpen ? "opacity-100" : "opacity-0"}`}
        role="button"
        tabIndex={-1}
        aria-label="Close prompt"
        onClick={onClose}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") onClose();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Prompt behind ${prompt.aiName}'s reply`}
        aria-hidden={!isOpen}
        className={`${MODAL_PANEL_CLASSES} flex max-h-[85vh] max-w-3xl flex-col ${modalPanelState(isOpen)}`}
      >
        <header className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className={MODAL_TITLE_CLASSES}>
              Prompt behind {prompt.aiName}&apos;s reply
            </h2>
            <p className="truncate pt-0.5 text-xs text-faint">
              {details.join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className="h-8 shrink-0 rounded-lg border border-line px-3 text-xs font-medium text-muted transition-colors hover:bg-raised hover:text-fg"
          >
            {isCopied ? "Copied" : "Copy JSON"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={MODAL_CLOSE_BUTTON_CLASSES}
            aria-label="Close prompt"
          >
            <Icon name="x-mark" className="h-4 w-4" />
          </button>
        </header>

        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <section aria-label="Reply">
            <h3 className="pb-1.5 text-xs font-semibold text-muted">Reply</h3>
            <p className="whitespace-pre-wrap break-words rounded-lg bg-raised px-3 py-2 text-sm text-fg">
              {prompt.reply}
            </p>
          </section>
          <section aria-label="Prompt messages" className="pt-4">
            <h3 className="pb-1.5 text-xs font-semibold text-muted">
              Prompt, oldest first
            </h3>
            <ol className="space-y-2">
              {prompt.messages.map((message, index) => (
                <PromptMessageBlock
                  // The prompt is a fixed snapshot, so position is its identity
                  key={index}
                  message={message}
                  index={index}
                />
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PromptViewerModal;
