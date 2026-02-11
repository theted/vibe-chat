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
import { useSocket } from "./hooks/useSocket";
import { useSocketEvents } from "./hooks/useSocketEvents";
import { useTheme } from "./hooks/useTheme";
import { useToasts } from "./hooks/useToasts";
import { useScrollToBottom } from "./hooks/useScrollToBottom";
import { useMessagePersistence } from "./hooks/useMessagePersistence";
import ToastContainer from "./components/ToastContainer";
import ChatView from "./components/ChatView";
import LoadingOverlay from "./components/LoadingOverlay";
import { ThemeContext } from "./context/ThemeContext";
import { PRIVATE_CONVERSATIONS_ENABLED, SERVER_URL } from "./constants/chat";
import { mapMentionsToAiNames, normalizeAlias } from "./utils/ai";
import type {
  Message,
  ConnectionStatus,
  RoomInfo,
  Participant,
  TypingUser,
  TypingAI,
} from "./types";
import type { AiParticipant } from "./config/aiParticipants";

const RECENT_MESSAGES_FOR_AI_CONTEXT = 10;
const SCROLL_ON_JOIN_DELAY_MS = 100;

function App() {
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
  const [previewMessages, setPreviewMessages] = useState<Message[]>([]);
  const [previewParticipants, setPreviewParticipants] = useState<Participant[]>([]);
  const [previewAiParticipants, setPreviewAiParticipants] = useState<AiParticipant[]>([]);
  const [roomInfo, setRoomInfo] = useState<RoomInfo>({ topic: "General discussion" });
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [aiParticipants, setAiParticipants] = useState<AiParticipant[]>([]);

  // Hooks
  const { theme, setTheme, toggleTheme } = useTheme();
  const { toasts, showToast } = useToasts();
  const { on, off, emit, triggerAI } = useSocket(SERVER_URL);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const usernameRef = useRef("");
  const isJoinedRef = useRef(false);
  const previewMessagesRef = useRef<Message[]>([]);
  const previewParticipantsRef = useRef<Participant[]>([]);
  const previewAiParticipantsRef = useRef<AiParticipant[]>([]);

  // Keep refs in sync
  useEffect(() => { usernameRef.current = username || ""; }, [username]);
  useEffect(() => { isJoinedRef.current = isJoined; }, [isJoined]);
  useEffect(() => { previewMessagesRef.current = previewMessages; }, [previewMessages]);
  useEffect(() => { previewParticipantsRef.current = previewParticipants; }, [previewParticipants]);
  useEffect(() => { previewAiParticipantsRef.current = previewAiParticipants; }, [previewAiParticipants]);

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
    const saved = localStorage.getItem("ai-chat-username");
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
      joinRoom(username, "default");
    }
  }, [connectionStatus.connected, hasSavedUsername, isJoined, joinRoom, username]);

  useEffect(() => {
    if (isJoined) setIsAuthLoading(false);
  }, [isJoined]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (!messagesEndRef.current) return;
    if (!showScrollButton) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showScrollButton]);

  // Scroll to bottom on join
  useEffect(() => {
    if (isJoined && messagesEndRef.current) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "instant" }), SCROLL_ON_JOIN_DELAY_MS);
    }
  }, [isJoined]);

  // Handlers
  const handleJoinRoom = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (username.trim()) {
      localStorage.setItem("ai-chat-username", username.trim());
      setHasSavedUsername(true);
      joinRoom(username.trim(), "default");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("ai-chat-username");
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

  const handleAIMention = (mentions: string[], message: string) => {
    const aiNames = mapMentionsToAiNames(mentions);
    if (aiNames.length > 0) {
      const recentMessages = messages.slice(-RECENT_MESSAGES_FOR_AI_CONTEXT);
      triggerAI(aiNames as string[], message, recentMessages);
    }
  };

  const handlePrivateConversationStart = useCallback(
    (ai: AiParticipant) => {
      if (!PRIVATE_CONVERSATIONS_ENABLED) return;

      const resolved = usernameRef.current.trim();
      if (!resolved) return;

      const aiId = ai.id || normalizeAlias(ai.alias || ai.name || "");
      if (!aiId) return;

      const roomId = `private:${resolved}:${aiId}`;
      setPreviewMessages([]);
      setMessages([]);
      setTypingUsers([]);
      setTypingAIs([]);
      joinRoom(resolved, roomId);
    },
    [joinRoom],
  );

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
          onAIMention={handleAIMention}
          onTypingStart={startTyping}
          onTypingStop={stopTyping}
          onPrivateConversationStart={handlePrivateConversationStart}
          error={error}
          messagesEndRef={messagesEndRef}
          messagesContainerRef={messagesContainerRef}
          aiParticipants={isJoined ? aiParticipants : previewAiParticipants}
        />
      )}
      <ToastContainer toasts={toasts} />
    </ThemeContext.Provider>
  );
}

export default App;
