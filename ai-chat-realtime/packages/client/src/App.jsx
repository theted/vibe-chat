/**
 * Main App Component - Real-time AI Chat Application
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "./hooks/useSocket";
import ToastContainer from "./components/ToastContainer.jsx";
import LoginView from "./components/LoginView.jsx";
import ChatView from "./components/ChatView.jsx";
import LoadingOverlay from "./components/LoadingOverlay.jsx";
import { ThemeContext } from "./context/ThemeContext.jsx";
import { SERVER_URL } from "./constants/chat.js";
import {
  normalizeAlias,
  resolveEmoji,
  mapMentionsToAiNames,
} from "./utils/ai.js";

function App() {
  // State
  const [username, setUsername] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
  });
  const [typingUsers, setTypingUsers] = useState([]);
  const [typingAIs, setTypingAIs] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("ai-chat-theme");
    if (stored === "dark" || stored === "light") {
      return stored;
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  });
  const [hasSavedUsername, setHasSavedUsername] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [previewMessages, setPreviewMessages] = useState([]);
  const [previewParticipants, setPreviewParticipants] = useState([]);
  const [previewAiParticipants, setPreviewAiParticipants] = useState([]);

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
  }, [connectionStatus.connected, hasSavedUsername, isJoined, joinRoom, username]);

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
    const saveMessagesToStorage = (messagesToSave) => {
      try {
        // Limit to last 20 messages
        const limitedMessages = messagesToSave.slice(-20);
        localStorage.setItem(
          "ai-chat-messages",
          JSON.stringify(limitedMessages)
        );
      } catch (error) {
        console.warn("Failed to save messages to localStorage:", error);
      }
    };

    if (isJoined && messages.length > 0) {
      saveMessagesToStorage(messages);
    }
  }, [messages, isJoined]);
  const [roomInfo, setRoomInfo] = useState({ topic: "General discussion" });
  const [aiStatus, setAiStatus] = useState({ status: "active" });
  const [error, setError] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Refs
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const usernameRef = useRef("");
  const toastTimeouts = useRef(new Map());
  const isJoinedRef = useRef(false);
  const previewMessagesRef = useRef([]);
  const previewParticipantsRef = useRef([]);

  useEffect(() => {
    usernameRef.current = username || "";
  }, [username]);

  useEffect(() => () => {
    toastTimeouts.current.forEach((timeoutId) => clearTimeout(timeoutId));
    toastTimeouts.current.clear();
  }, []);
  useEffect(() => {
    isJoinedRef.current = isJoined;
  }, [isJoined]);

  useEffect(() => {
    previewMessagesRef.current = previewMessages;
  }, [previewMessages]);

  useEffect(() => {
    previewParticipantsRef.current = previewParticipants;
  }, [previewParticipants]);

  const showToast = useCallback((message, type = "info") => {
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
    on("connection-status", (status) => {
      console.log("🔌 Connection status update:", status);
      setConnectionStatus(status);
      if (!status.connected) {
        setIsJoined(false);
      }
    });

    on("connection-established", (data) => {
      console.log("Connection established:", data);
    });

    on("recent-messages", (payload = {}) => {
      const incomingMessages = Array.isArray(payload.messages)
        ? payload.messages
        : [];
      const incomingParticipants = Array.isArray(payload.participants)
        ? payload.participants
        : [];
      const incomingAiParticipants = Array.isArray(payload.aiParticipants)
        ? payload.aiParticipants
        : [];

      setPreviewMessages(incomingMessages);
      setPreviewParticipants(incomingParticipants);
      setPreviewAiParticipants(incomingAiParticipants);

      if (!isJoinedRef.current) {
        setMessages(incomingMessages);
      }
    });

    on("preview-message", (payload = {}) => {
      const message = payload.message;
      if (!message) return;

      setPreviewMessages((prev) => {
        const next = [...prev, message];
        return next.slice(-20);
      });

      if (Array.isArray(payload.participants)) {
        setPreviewParticipants(payload.participants);
      }
      if (Array.isArray(payload.aiParticipants)) {
        setPreviewAiParticipants(payload.aiParticipants);
      }

      if (!isJoinedRef.current) {
        setMessages((prev) => [...prev, message].slice(-20));
      }
    });

    // Room events
    on("room-joined", (data) => {
      setIsJoined(true);
      setRoomInfo(data);
      setParticipants(data.participants || []);
      setError(null);
      setIsAuthLoading(false);
      setHasSavedUsername(true);
      setMessages(() =>
        previewMessagesRef.current.length > 0
          ? [...previewMessagesRef.current]
          : []
      );
      if ((data.participants || []).length === 0 && previewParticipantsRef.current.length > 0) {
        setParticipants(previewParticipantsRef.current);
      }
      console.log("Joined room:", data);
    });

    on("user-joined", (data) => {
      showToast(`${data.username} joined the chat`, "success");
    });

    on("user-left", (data) => {
      showToast(`${data.username} left the chat`, "warning");
      setTypingUsers((prev) =>
        prev.filter((user) => user.normalized !== data.username?.toLowerCase())
      );
    });

    // Message events
    on("new-message", (message) => {
      setMessages((prev) => [
        ...prev,
        {
          ...message,
          id: message.id || `msg-${Date.now()}-${Math.random()}`,
        },
      ]);
    });

    // Topic events
    on("topic-changed", (data) => {
      setRoomInfo((prev) => ({ ...prev, topic: data.newTopic }));
      const systemMessage = {
        id: `topic-changed-${Date.now()}`,
        sender: "System",
        content: `Topic changed to: "${data.newTopic}" by ${data.changedBy}`,
        senderType: "system",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, systemMessage]);
    });

    // AI status events
    on("ai-status-changed", (data) => {
      setAiStatus(data);
    });

    on("ais-sleeping", (data) => {
      setAiStatus({ status: "sleeping", reason: data.reason });
    });

    on("ais-awakened", () => {
      setAiStatus({ status: "active" });
    });

    // Error events
    on("error", (data) => {
      setError(data.message);
      setIsAuthLoading(false);
      setTimeout(() => setError(null), 5000);
    });

    // Room info events
    on("room-info", (data) => {
      setRoomInfo(data.room);
      setParticipants(data.participants || []);
    });

    // Typing events
    on("user-typing-start", (data) => {
      console.log("👤 User started typing:", data);
      setTypingUsers((prev) => {
        const name = data?.username || data?.name;
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
              displayName: data.displayName || name,
              normalized,
              type: "user",
              isLocal,
            },
          ];
        }

        if (isLocal) {
          return prev.map((user) =>
            user.normalized === normalized ? { ...user, isLocal: true } : user
          );
        }

        return prev;
      });
    });

    on("user-typing-stop", (data) => {
      console.log("👤 User stopped typing:", data);
      const name = data?.username || data?.name;
      if (!name) return;
      const normalized = name.toLowerCase();
      const isLocal =
        usernameRef.current &&
        normalized === usernameRef.current.toLowerCase();

      setTypingUsers((prev) =>
        prev
          .filter((user) => user.normalized !== normalized)
          .filter((user) =>
            isLocal ? user.normalized !== normalized : true
          )
      );
    });

    on("ai-generating-start", (data) => {
      console.log("🤖 AI started generating:", data);
      setTypingAIs((prev) => {
        const id =
          data?.aiId ||
          (data?.providerKey && data?.modelKey
            ? `${data.providerKey}_${data.modelKey}`
            : undefined);
        const alias = data?.alias || data?.displayName || data?.aiName;
        const displayName = data?.displayName || alias || id || "AI";
        const normalized = normalizeAlias(alias || displayName || id);

        const exists = prev.some(
          (ai) =>
            (id && ai.id === id) ||
            (normalized && ai.normalizedAlias === normalized)
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
            type: "ai",
            emoji: data?.emoji || resolveEmoji(alias || displayName || ""),
          },
        ];
      });
    });

    on("ai-generating-stop", (data) => {
      console.log("🤖 AI stopped generating:", data);
      const id =
        data?.aiId ||
        (data?.providerKey && data?.modelKey
          ? `${data.providerKey}_${data.modelKey}`
          : undefined);
      const normalized = normalizeAlias(
        data?.alias || data?.displayName || data?.aiName
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
        })
      );
    });
  }, [on, showToast]);

  // Auto-scroll to bottom when new messages arrive or when joining chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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
  const handleJoinRoom = (e) => {
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
        : []
    );
    setTypingUsers([]);
    setTypingAIs([]);
    setHasSavedUsername(false);
    setIsAuthLoading(false);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };


  function handleSendMessage(content) {
    sendMessage(content);
  }

  function scrollToBottom() {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => setShowScrollButton(false), 500);
    }
  }

  function handleAIMention(mentions, message) {
    const aiNames = mapMentionsToAiNames(mentions);

    if (aiNames.length > 0) {
      // Send recent chat context along with the trigger
      const recentMessages = messages.slice(-10); // Last 10 messages for context
      triggerAI(aiNames, message, recentMessages);
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
