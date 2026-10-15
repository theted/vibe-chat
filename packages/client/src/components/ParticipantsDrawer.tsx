/**
 * ParticipantsDrawer - the participants list as a sheet sliding in from the
 * right on screens too narrow for the sidebar.
 */

import ParticipantsList from "./ParticipantsList";
import { MODAL_BACKDROP_CLASSES } from "@/constants/modalStyles";
import type { AiParticipant } from "@/config/aiParticipants";
import type { ParticipantsListProps } from "@/types";

interface ParticipantsDrawerProps extends Omit<
  ParticipantsListProps,
  "variant" | "onClose" | "isVisible"
> {
  isOpen: boolean;
  isVisible: boolean;
  onClose: () => void;
}

const ParticipantsDrawer = ({
  isOpen,
  isVisible,
  onClose,
  onAISelect,
  ...listProps
}: ParticipantsDrawerProps) => {
  if (!isVisible) return null;

  // Picking a model starts a private chat, which the user wants to see
  const handleAISelect = onAISelect
    ? (ai: AiParticipant) => {
        onAISelect(ai);
        onClose();
      }
    : undefined;

  return (
    <div
      className={`fixed inset-0 z-40 lg:hidden ${isOpen ? "" : "pointer-events-none"}`}
    >
      <div
        className={`${MODAL_BACKDROP_CLASSES} ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="People and models in the room"
        className={`absolute inset-y-0 right-0 w-[min(20rem,85vw)] border-l border-line shadow-2xl shadow-black/40 transition-transform duration-200 ease-out animate-slide-in-right ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <ParticipantsList
          {...listProps}
          variant="drawer"
          onClose={onClose}
          onAISelect={handleAISelect}
        />
      </div>
    </div>
  );
};

export default ParticipantsDrawer;
