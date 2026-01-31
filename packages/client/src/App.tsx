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
import ToastContainer from "./components/ToastContainer";
import LoginView from "./components/LoginView";
import ChatView from "./components/ChatView";
import LoadingOverlay from "./components/LoadingOverlay";
import { ThemeContext } from "./context/ThemeContext";
import { SERVER_URL } from "./constants/chat";
import { LOCAL_STORAGE_MESSAGES_LIMIT } from "./constants/storage";
import { normalizeAlias, resolveEmoji, mapMentionsToAiNames } from "./utils/ai";
import type {
  Theme,
  Message,
  Toast,
  ToastType,
  ConnectionStatus,
  RoomInfo,
  AIStatus,
  Participant,
  TypingUser,
  TypingAI,
} from "./types";
import type { AiParticipant } from "./config/aiParticipants";

function App() {
  // State
  const [username, setUsername] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
  });
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [typingAIs, setTypingAIs] = useState<TypingAI[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("ai-chat-theme");
    if (stored === "dark" || stored === "light") {
      return stored;
    }
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    return prefersDark ? "dark" : "light";
  });
  const [hasSavedUsername, setHasSavedUsername] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [previewMessages, setPreviewMessages] = useState<Message[]>([]);
  const [previewParticipants, setPreviewParticipants] = useState<Participant[]>(
    [],
  );
  const [previewAiParticipants, setPreviewAiParticipants] = useState<
    AiParticipant[]
  >([]);

  const { on, joinRoom, sendMessage, triggerAI, startTyping, stopTyping } =
    useSocket(SERVER_URL);
  // Load username from localStorage on mount and prepare auto-join
  useEffect(() => {
    const savedUsername = localStorage.getItem("ai-chat-username");
    if (savedUsername) {
      setUsername(savedUsername);
      setHasSavedUsername(true);
    } else {
      setIsAuthLoading(false);
    }
  }, []);

  // Auto-join when connection is established and we have a saved username
  useEffect(() => {
    if (
      hasSavedUsername &&
      connectionStatus.connected &&
      !isJoined &&
      username
    ) {
      joinRoom(username, "default");
      setIsAuthLoading(true);
    }
  }, [
    connectionStatus.connected,
    hasSavedUsername,
    isJoined,
    joinRoom,
    username,
  ]);

  useEffect(() => {
    if (isJoined) {
      setIsAuthLoading(false);
    }
  }, [isJoined]);

  // Apply theme and persist selection
  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = document.documentElement;
    const isDark = theme === "dark";
    root.classList.toggle("dark", isDark);
    root.dataset.theme = theme;
    localStorage.setItem("ai-chat-theme", theme);
  }, [theme]);

  // Debug connection status changes
  useEffect(() => {
    console.log("🔌 Connection status changed:", connectionStatus);
  }, [connectionStatus]);

  // Load messages from localStorage on component mount
  useEffect(() => {
    const loadStoredMessages = () => {
      try {
        const stored = localStorage.getItem("ai-chat-messages");
        if (stored) {
          const parsedMessages = JSON.parse(stored);
          if (Array.isArray(parsedMessages)) {
            setMessages(parsedMessages);
          }
        }
      } catch (error) {
        console.warn("Failed to load messages from localStorage:", error);
      }
    };

    loadStoredMessages();
  }, []);

  // Save messages to localStorage whenever messages change
  useEffect(() => {
    const saveMessagesToStorage = (messagesToSave: Message[]) => {
      try {
        // Limit to the most recent messages so storage usage stays predictable
        const limitedMessages = messagesToSave.slice(
          -LOCAL_STORAGE_MESSAGES_LIMIT,
        );
        localStorage.setItem(
          "ai-chat-messages",
          JSON.stringify(limitedMessages),
        );
      } catch (error) {
        console.warn("Failed to save messages to localStorage:", error);
      }
    };

    if (isJoined && messages.length > 0) {
      saveMessagesToStorage(messages);
    }
  }, [messages, isJoined]);
  const [roomInfo, setRoomInfo] = useState<RoomInfo>({
    topic: "General discussion",
  });
  const [aiStatus, setAiStatus] = useState<AIStatus>({ status: "active" });
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [aiParticipants, setAiParticipants] = useState<AiParticipant[]>([]);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const usernameRef = useRef("");
  const toastTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const isJoinedRef = useRef(false);
  const previewMessagesRef = useRef<Message[]>([]);
  const previewParticipantsRef = useRef<Participant[]>([]);
  const previewAiParticipantsRef = useRef<AiParticipant[]>([]);

  useEffect(() => {
    usernameRef.current = username || "";
  }, [username]);

  useEffect(
    () => () => {
      toastTimeouts.current.forEach((timeoutId) => clearTimeout(timeoutId));
      toastTimeouts.current.clear();
    },
    [],
  );
  useEffect(() => {
    isJoinedRef.current = isJoined;
  }, [isJoined]);

  useEffect(() => {
    previewMessagesRef.current = previewMessages;
  }, [previewMessages]);

  useEffect(() => {
    previewParticipantsRef.current = previewParticipants;
  }, [previewParticipants]);

  useEffect(() => {
    previewAiParticipantsRef.current = previewAiParticipants;
  }, [previewAiParticipants]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    const timeoutId = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
      toastTimeouts.current.delete(id);
    }, 3500);

    toastTimeouts.current.set(id, timeoutId);
  }, []);

  // Setup socket event listeners
  useEffect(() => {
    // Connection events
    on("connection-status", (status: unknown) => {
      console.log("🔌 Connection status update:", status);
      setConnectionStatus(status as ConnectionStatus);
      if (!(status as ConnectionStatus).connected) {
        setIsJoined(false);
      }
    });

    on("connection-established", (data: unknown) => {
      console.log("Connection established:", data);
    });

    on("recent-messages", (payload: unknown = {}) => {
      const typedPayload = payload as {
        messages?: Message[];
        participants?: Participant[];
        aiParticipants?: AiParticipant[];
      };
      const incomingMessages = Array.isArray(typedPayload.messages)
        ? typedPayload.messages
        : [];
      const incomingParticipants = Array.isArray(typedPayload.participants)
        ? typedPayload.participants
        : [];
      const incomingAiParticipants = Array.isArray(typedPayload.aiParticipants)
        ? typedPayload.aiParticipants
        : [];

      setPreviewMessages(incomingMessages);
      setPreviewParticipants(incomingParticipants);
      setPreviewAiParticipants(incomingAiParticipants);
      setAiParticipants(incomingAiParticipants);

      if (!isJoinedRef.current) {
        setMessages(incomingMessages);
      }
    });

    on("preview-message", (payload: unknown = {}) => {
      const typedPayload = payload as {
        message?: Message;
        participants?: Participant[];
        aiParticipants?: AiParticipant[];
      };
      const message = typedPayload.message;
      if (!message) return;

      setPreviewMessages((prev) => {
        const next = [...prev, message];
        return next.slice(-LOCAL_STORAGE_MESSAGES_LIMIT);
      });

      if (Array.isArray(typedPayload.participants)) {
        setPreviewParticipants(typedPayload.participants);
      }
      if (Array.isArray(typedPayload.aiParticipants)) {
        setPreviewAiParticipants(typedPayload.aiParticipants);
        if (isJoinedRef.current) {
          setAiParticipants(typedPayload.aiParticipants);
        }
      }

      if (!isJoinedRef.current) {
        setMessages((prev) =>
          [...prev, message].slice(-LOCAL_STORAGE_MESSAGES_LIMIT),
        );
      }
    });

    // Room events
    on("room-joined", (data: unknown) => {
      const typedData = data as RoomInfo & {
        participants?: Participant[];
        aiParticipants?: AiParticipant[];
      };
      setIsJoined(true);
      setRoomInfo(typedData);
      setParticipants(typedData.participants || []);
      setAiParticipants(
        typedData.aiParticipants || previewAiParticipantsRef.current || [],
      );
      setError(null);
      setIsAuthLoading(false);
      setHasSavedUsername(true);
      setMessages(() =>
        previewMessagesRef.current.length > 0
          ? [...previewMessagesRef.current]
          : [],
      );
      if (
        (typedData.participants || []).length === 0 &&
        previewParticipantsRef.current.length > 0
      ) {
        setParticipants(previewParticipantsRef.current);
      }
      console.log("Joined room:", data);
    });

    on("user-joined", (data: unknown) => {
      const typedData = data as { username: string };
      showToast(`${typedData.username} joined the chat`, "success");
    });

    on("user-left", (data: unknown) => {
      const typedData = data as { username: string };
      showToast(`${typedData.username} left the chat`, "warning");
      setTypingUsers((prev) =>
        prev.filter(
          (user) => user.normalized !== typedData.username?.toLowerCase(),
        ),
      );
    });

    // Message events
    on("new-message", (message: unknown) => {
      const typedMessage = message as Message;
      setMessages((prev) => [
        ...prev,
        {
          ...typedMessage,
          id: typedMessage.id || `msg-${Date.now()}-${Math.random()}`,
        },
      ]);
    });

    // Topic events
    on("topic-changed", (data: unknown) => {
      const typedData = data as { newTopic: string; changedBy: string };
      setRoomInfo((prev) => ({ ...prev, topic: typedData.newTopic }));
      const systemMessage: Message = {
        id: `topic-changed-${Date.now()}`,
        sender: "System",
        content: `Topic changed to: "${typedData.newTopic}" by ${typedData.changedBy}`,
        senderType: "system",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, systemMessage]);
    });

    // AI status events
    on("ai-status-changed", (data: unknown) => {
      setAiStatus(data as AIStatus);
    });

    on("ais-sleeping", (data: unknown) => {
      const typedData = data as { reason?: string };
      setAiStatus({ status: "sleeping", reason: typedData.reason });
    });

    on("ais-awakened", () => {
      setAiStatus({ status: "active" });
    });

    // Error events
    on("error", (data: unknown) => {
      const typedData = data as { message: string };
      setError(typedData.message);
      setIsAuthLoading(false);
      setTimeout(() => setError(null), 5000);
    });

    // Room info events
    on("room-info", (data: unknown) => {
      const typedData = data as {
        room: RoomInfo;
        participants?: Participant[];
        aiParticipants?: AiParticipant[];
      };
      setRoomInfo(typedData.room);
      setParticipants(typedData.participants || []);
      if (Array.isArray(typedData.aiParticipants)) {
        setAiParticipants(typedData.aiParticipants);
      }
    });

    // Typing events
    on("user-typing-start", (data: unknown) => {
      const typedData = data as {
        username?: string;
        name?: string;
        displayName?: string;
      };
      console.log("👤 User started typing:", data);
      setTypingUsers((prev) => {
        const name = typedData?.username || typedData?.name;
        if (!name) return prev;
        const normalized = name.toLowerCase();
        const isLocal =
          usernameRef.current &&
          normalized === usernameRef.current.toLowerCase();

        const exists = prev.some((user) => user.normalized === normalized);
        if (!exists) {
          return [
            ...prev,
            {
              id: normalized,
              name,
              displayName: typedData.displayName || name,
              normalized,
              type: "user" as const,
              isLocal,
            },
          ];
        }

        if (isLocal) {
          return prev.map((user) =>
            user.normalized === normalized ? { ...user, isLocal: true } : user,
          );
        }

        return prev;
      });
    });

    on("user-typing-stop", (data: unknown) => {
      const typedData = data as { username?: string; name?: string };
      console.log("👤 User stopped typing:", data);
      const name = typedData?.username || typedData?.name;
      if (!name) return;
      const normalized = name.toLowerCase();
      const isLocal =
        usernameRef.current && normalized === usernameRef.current.toLowerCase();

      setTypingUsers((prev) =>
        prev
          .filter((user) => user.normalized !== normalized)
          .filter((user) => (isLocal ? user.normalized !== normalized : true)),
      );
    });

    on("ai-generating-start", (data: unknown) => {
      const typedData = data as {
        aiId?: string;
        providerKey?: string;
        modelKey?: string;
        alias?: string;
        displayName?: string;
        aiName?: string;
        emoji?: string;
      };
      console.log("🤖 AI started generating:", data);
      setTypingAIs((prev) => {
        const id =
          typedData?.aiId ||
          (typedData?.providerKey && typedData?.modelKey
            ? `${typedData.providerKey}_${typedData.modelKey}`
            : undefined);
        const alias =
          typedData?.alias || typedData?.displayName || typedData?.aiName;
        const displayName = typedData?.displayName || alias || id || "AI";
        const normalized = normalizeAlias(alias || displayName || id);

        const exists = prev.some(
          (ai) =>
            (id && ai.id === id) ||
            (normalized && ai.normalizedAlias === normalized),
        );
        if (exists) {
          return prev;
        }

        return [
          ...prev,
          {
            id: id || normalized,
            name: alias || displayName,
            displayName,
            alias: alias || displayName,
            normalizedAlias: normalized,
            type: "ai" as const,
            emoji: typedData?.emoji || resolveEmoji(alias || displayName || ""),
          },
        ];
      });
    });

    on("ai-generating-stop", (data: unknown) => {
      const typedData = data as {
        aiId?: string;
        providerKey?: string;
        modelKey?: string;
        alias?: string;
        displayName?: string;
        aiName?: string;
      };
      console.log("🤖 AI stopped generating:", data);
      const id =
        typedData?.aiId ||
        (typedData?.providerKey && typedData?.modelKey
          ? `${typedData.providerKey}_${typedData.modelKey}`
          : undefined);
      const normalized = normalizeAlias(
        typedData?.alias || typedData?.displayName || typedData?.aiName,
      );
      setTypingAIs((prev) =>
        prev.filter((ai) => {
          if (id && ai.id === id) {
            return false;
          }
          if (normalized && ai.normalizedAlias === normalized) {
            return false;
          }
          return true;
        }),
      );
    });
  }, [on, showToast]);

  // Auto-scroll to bottom when new messages arrive and the user is already near the bottom
  useEffect(() => {
    if (!messagesEndRef.current) {
      return;
    }

    if (!showScrollButton) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showScrollButton]);

  // Scroll to bottom immediately when joining chat
  useEffect(() => {
    if (isJoined && messagesEndRef.current) {
      // Use timeout to ensure DOM is fully rendered
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      }, 100);
    }
  }, [isJoined]);

  // Handle scroll to show/hide scroll button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Handlers
  const handleJoinRoom = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (username.trim()) {
      // Save username to localStorage
      localStorage.setItem("ai-chat-username", username.trim());
      setHasSavedUsername(true);
      setIsAuthLoading(true);
      joinRoom(username.trim(), "default");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("ai-chat-username");
    setUsername("");
    setIsJoined(false);
    setMessages(
      previewMessagesRef.current.length > 0
        ? [...previewMessagesRef.current]
        : [],
    );
    setTypingUsers([]);
    setTypingAIs([]);
    setHasSavedUsername(false);
    setIsAuthLoading(false);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleClearCommand = useCallback(() => {
    setMessages([]);
    try {
      localStorage.removeItem("ai-chat-messages");
    } catch (error) {
      console.warn("Failed to clear messages from localStorage:", error);
    }
    showToast("Chat history cleared", "info");
  }, [showToast]);

  function handleSendMessage(content: string) {
    if (content.startsWith("/")) {
      const [command] = content.slice(1).trim().split(/\s+/, 1);
      if (command?.toLowerCase() === "clear") {
        handleClearCommand();
        return;
      }
    }

    sendMessage(content);
  }

  function scrollToBottom() {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => setShowScrollButton(false), 500);
    }
  }

  function handleAIMention(mentions: string[], message: string) {
    const aiNames = mapMentionsToAiNames(mentions);

    if (aiNames.length > 0) {
      // Send recent chat context along with the trigger
      const recentMessages = messages.slice(-10); // Last 10 messages for context
      triggerAI(aiNames as string[], message, recentMessages);
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      <LoadingOverlay visible={isAuthLoading} />
      {!isAuthLoading &&
        (isJoined ? (
          <ChatView
            theme={theme}
            toggleTheme={toggleTheme}
            connectionStatus={connectionStatus}
            roomInfo={roomInfo}
            username={username}
            participants={participants}
            messages={messages}
            typingUsers={typingUsers}
            typingAIs={typingAIs}
            showScrollButton={showScrollButton}
            onScrollToBottom={scrollToBottom}
            onLogout={handleLogout}
            onSendMessage={handleSendMessage}
            onAIMention={handleAIMention}
            onTypingStart={startTyping}
            onTypingStop={stopTyping}
            error={error}
            messagesEndRef={messagesEndRef}
            messagesContainerRef={messagesContainerRef}
            aiParticipants={aiParticipants}
          />
        ) : (
          <LoginView
            connectionStatus={connectionStatus}
            toggleTheme={toggleTheme}
            theme={theme}
            username={username}
            onUsernameChange={setUsername}
            onJoin={handleJoinRoom}
            error={error}
            previewMessages={previewMessages}
            previewParticipants={previewParticipants}
            previewAiParticipants={previewAiParticipants}
          />
        ))}
      <ToastContainer toasts={toasts} />
    </ThemeContext.Provider>
  );
}

export default App;
