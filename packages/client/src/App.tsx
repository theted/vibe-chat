/**
 * Main App Component - Real-time AI Chat Application
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type FormEvent,
} from "react";
import { DEFAULT_ROOM_ID } from "@ai-chat/ai-configs";
import { useSocket } from "./hooks/useSocket";
import { usePrivateConversation } from "./hooks/usePrivateConversation";
import { useSocketEvents } from "./hooks/useSocketEvents";
import { useTheme } from "./hooks/useTheme";
import { useToasts } from "./hooks/useToasts";
import { useScrollToBottom } from "./hooks/useScrollToBottom";
import { useMessagePersistence } from "./hooks/useMessagePersistence";
import { usePreviewState } from "./hooks/usePreviewState";
import { useChatAutoScroll } from "./hooks/useChatAutoScroll";
import ToastContainer from "./components/ToastContainer";
import ChatView from "./components/ChatView";
import LoadingOverlay from "./components/LoadingOverlay";
import { ThemeContext } from "./context/ThemeContext";
import { SERVER_URL } from "./constants/chat";
import { getStorageItem, removeStorageItem, setStorageItem } from "./utils/storage";
import { STORAGE_KEYS } from "./constants/storage";
import type {
  Message,
  ConnectionStatus,
  RoomInfo,
  Participant,
  TypingUser,
  TypingAI,
} from "./types";
import type { AiParticipant } from "./config/aiParticipants";


const App = () => {
  // Core state
  const [username, setUsername] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
  });
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [typingAIs, setTypingAIs] = useState<TypingAI[]>([]);
  const [hasSavedUsername, setHasSavedUsername] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [roomInfo, setRoomInfo] = useState<RoomInfo>({ topic: "General discussion" });
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  // null until the server reports; see usePreviewState for why [] differs
  const [aiParticipants, setAiParticipants] = useState<AiParticipant[] | null>(
    null,
  );

  // Hooks
  const { theme, setTheme, toggleTheme } = useTheme();
  const { toasts, showToast } = useToasts();
  const { on, off, emit } = useSocket(SERVER_URL);
  const {
    setPreviewMessages,
    previewParticipants,
    setPreviewParticipants,
    previewAiParticipants,
    setPreviewAiParticipants,
    previewMessagesRef,
    previewParticipantsRef,
    previewAiParticipantsRef,
  } = usePreviewState();

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const usernameRef = useRef("");
  const isJoinedRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { usernameRef.current = username || ""; }, [username]);
  useEffect(() => { isJoinedRef.current = isJoined; }, [isJoined]);

  const { showScrollButton, scrollToBottom } = useScrollToBottom(
    messagesContainerRef,
    messagesEndRef,
  );

  const { clearMessages } = useMessagePersistence(messages, setMessages, isJoined);

  // Socket events - consume returned helpers to avoid duplicate implementations
  const { sendMessage, joinRoom, startTyping, stopTyping } = useSocketEvents({
    on,
    off,
    emit,
    setConnectionStatus,
    setIsJoined,
    setRoomInfo,
    setParticipants,
    setAiParticipants,
    setMessages,
    setTypingUsers,
    setTypingAIs,
    setError,
    setIsAuthLoading,
    setHasSavedUsername,
    setPreviewMessages,
    setPreviewParticipants,
    setPreviewAiParticipants,
    isJoinedRef,
    previewMessagesRef,
    previewParticipantsRef,
    previewAiParticipantsRef,
    usernameRef,
    showToast,
  });

  // Load saved username on mount
  useEffect(() => {
    const saved = getStorageItem(STORAGE_KEYS.USERNAME);
    if (saved) {
      setUsername(saved);
      setHasSavedUsername(true);
    } else {
      setIsAuthLoading(false);
    }
  }, []);

  // Auto-join when connected with saved username
  // joinRoom from useSocketEvents already sets isAuthLoading
  useEffect(() => {
    if (hasSavedUsername && connectionStatus.connected && !isJoined && username) {
      joinRoom(username, DEFAULT_ROOM_ID);
    }
  }, [connectionStatus.connected, hasSavedUsername, isJoined, joinRoom, username]);

  useEffect(() => {
    if (isJoined) setIsAuthLoading(false);
  }, [isJoined]);

  useChatAutoScroll(messagesEndRef, messages, showScrollButton, isJoined);

  // Switching rooms must not carry the previous room's transcript across
  const resetConversationView = useCallback(() => {
    setPreviewMessages([]);
    setMessages([]);
    setTypingUsers([]);
    setTypingAIs([]);
  }, [setPreviewMessages]);

  const {
    privateChatAi,
    isPrivateChat,
    startPrivateConversation,
    leavePrivateConversation,
  } = usePrivateConversation({
    roomInfo,
    aiParticipants: (isJoined ? aiParticipants : previewAiParticipants) ?? [],
    usernameRef,
    joinRoom,
    resetConversationView,
  });

  // Handlers
  const handleJoinRoom = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (username.trim()) {
      setStorageItem(STORAGE_KEYS.USERNAME, username.trim());
      setHasSavedUsername(true);
      joinRoom(username.trim(), DEFAULT_ROOM_ID);
    }
  };

  const handleLogout = () => {
    removeStorageItem(STORAGE_KEYS.USERNAME);
    setUsername("");
    setIsJoined(false);
    setMessages(
      previewMessagesRef.current.length > 0 ? [...previewMessagesRef.current] : [],
    );
    setTypingUsers([]);
    setTypingAIs([]);
    setHasSavedUsername(false);
    setIsAuthLoading(false);
  };

  const handleSendMessage = (content: string) => {
    if (content.startsWith("/")) {
      const [command] = content.slice(1).trim().split(/\s+/, 1);
      if (command?.toLowerCase() === "clear") {
        clearMessages();
        showToast("Chat history cleared", "info");
        return;
      }
    }
    sendMessage(content);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      <LoadingOverlay visible={isAuthLoading} />
      {!isAuthLoading && (
        <ChatView
          theme={theme}
          toggleTheme={toggleTheme}
          connectionStatus={connectionStatus}
          roomInfo={roomInfo}
          username={username}
          isAuthenticated={isJoined}
          participants={isJoined ? participants : previewParticipants}
          messages={messages}
          typingUsers={typingUsers}
          typingAIs={typingAIs}
          showScrollButton={showScrollButton}
          onScrollToBottom={scrollToBottom}
          onLogout={handleLogout}
          onJoin={handleJoinRoom}
          onUsernameChange={setUsername}
          onSendMessage={handleSendMessage}
          onTypingStart={startTyping}
          onTypingStop={stopTyping}
          onPrivateConversationStart={startPrivateConversation}
          onPrivateConversationEnd={leavePrivateConversation}
          isPrivateChat={isPrivateChat}
          privateChatAi={privateChatAi}
          error={error}
          messagesEndRef={messagesEndRef}
          messagesContainerRef={messagesContainerRef}
          aiParticipants={isJoined ? aiParticipants : previewAiParticipants}
        />
      )}
      <ToastContainer toasts={toasts} />
    </ThemeContext.Provider>
  );
};

export default App;
