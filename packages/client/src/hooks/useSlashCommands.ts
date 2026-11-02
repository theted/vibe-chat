/**
 * useSlashCommands Hook - runs /clear and /debug against the server and
 * applies what comes back: ROOM_CLEARED empties the room for everyone in it,
 * LAST_PROMPT opens the prompt viewer for whoever asked.
 */

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_ROOM_ID,
  SOCKET_EVENTS,
  type LastPromptPayload,
  type RoomClearedPayload,
  type WirePromptRecord,
} from "@ai-chat/ai-configs";
import { STORAGE_KEYS } from "@/constants/storage";
import { useModal } from "@/hooks/useModal";
import { formatCommandList, parseSlashCommand } from "@/utils/slashCommands";
import { removeStorageItem } from "@/utils/storage";
import type { Message } from "@/types";

type StateSetter<T> = React.Dispatch<React.SetStateAction<T>>;
type ShowToast = (message: string, type?: string) => void;

interface UseSlashCommandsOptions {
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  off: (event: string, handler: (...args: unknown[]) => void) => void;
  emit: (event: string, data?: unknown) => void;
  setMessages: StateSetter<Message[]>;
  setPreviewMessages: StateSetter<Message[]>;
  isJoinedRef: React.MutableRefObject<boolean>;
  showToast: ShowToast;
}

const NO_PROMPT_NOTICE =
  "No AI reply here has a prompt on record yet. Prompts live in server memory, so a restart forgets them.";

/** The line left in an emptied room, so people see why it's empty. */
const clearedNotice = ({ by, timestamp }: RoomClearedPayload): Message => ({
  id: `room-cleared-${timestamp}`,
  sender: "System",
  senderType: "system",
  content: `${by} cleared the chat`,
  timestamp,
});

export const useSlashCommands = ({
  on,
  off,
  emit,
  setMessages,
  setPreviewMessages,
  isJoinedRef,
  showToast,
}: UseSlashCommandsOptions) => {
  const [lastPrompt, setLastPrompt] = useState<WirePromptRecord | null>(null);
  const promptViewer = useModal();
  const openPromptViewer = promptViewer.open;

  useEffect(() => {
    // The server only sends this to the cleared room, plus the preview
    // audience when it's the main room, so whatever is on screen goes
    const handleRoomCleared = (data: unknown) => {
      const payload = data as RoomClearedPayload;
      if (payload.roomId === DEFAULT_ROOM_ID) setPreviewMessages([]);
      removeStorageItem(STORAGE_KEYS.MESSAGES);
      setMessages(isJoinedRef.current ? [clearedNotice(payload)] : []);
    };

    const handleLastPrompt = (data: unknown) => {
      const { prompt } = data as LastPromptPayload;
      if (!prompt) {
        showToast(NO_PROMPT_NOTICE, "info");
        return;
      }
      setLastPrompt(prompt);
      openPromptViewer();
    };

    on(SOCKET_EVENTS.ROOM_CLEARED, handleRoomCleared);
    on(SOCKET_EVENTS.LAST_PROMPT, handleLastPrompt);
    return () => {
      off(SOCKET_EVENTS.ROOM_CLEARED, handleRoomCleared);
      off(SOCKET_EVENTS.LAST_PROMPT, handleLastPrompt);
    };
  }, [
    on,
    off,
    setMessages,
    setPreviewMessages,
    isJoinedRef,
    showToast,
    openPromptViewer,
  ]);

  /**
   * Run `content` if it's a slash command. True means it was one (known or
   * not) and must not be posted as a message.
   */
  const runCommand = useCallback(
    (content: string): boolean => {
      const command = parseSlashCommand(content);
      if (!command) return false;

      if (command.kind === "unknown") {
        showToast(
          `Unknown command /${command.name}. Try ${formatCommandList()}.`,
          "error",
        );
      } else if (command.name === "clear") {
        emit(SOCKET_EVENTS.CLEAR_ROOM);
      } else {
        emit(SOCKET_EVENTS.GET_LAST_PROMPT);
      }
      return true;
    },
    [emit, showToast],
  );

  return { runCommand, lastPrompt, promptViewer };
};
