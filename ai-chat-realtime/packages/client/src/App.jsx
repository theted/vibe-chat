/**
 * Main App Component - Real-time AI Chat Application
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSocket } from "./hooks/useSocket";
import ChatMessage from "./components/ChatMessage";
import MessageInput from "./components/MessageInput";
import TopicControls from "./components/TopicControls";
import ParticipantsList from "./components/ParticipantsList";
import TypingIndicator from "./components/TypingIndicator";
import ToastContainer from "./components/ToastContainer.jsx";
import Icon from "./components/Icon.jsx";
import { ThemeContext } from "./context/ThemeContext.jsx";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

const normalizeAlias = (value) =>
  value ? value.toString().toLowerCase().replace(/[^a-z0-9]/g, "") : "";

const AI_EMOJI_LOOKUP = {
  claude: "🤖",
  anthropic: "🤖",
  gpt: "🧠",
  gpt4: "🧠",
  gpt35: "🧠",
  openai: "🧠",
  grok: "🦾",
  xai: "🦾",
  gemini: "💎",
  google: "💎",
  bard: "💎",
  cohere: "🔮",
  command: "🔮",
  commandr: "🔮",
  mistral: "🌟",
  kimi: "🎯",
  moonshot: "🎯",
  zai: "⚡",
  z: "⚡",
  "z.ai": "⚡"
};

const resolveEmoji = (value) => {
  const normalized = normalizeAlias(value);
  if (!normalized) {
    return "🤖";
  }
  const directMatch = AI_EMOJI_LOOKUP[normalized];
  if (directMatch) {
    return directMatch;
  }

  const aliasKey = Object.keys(AI_EMOJI_LOOKUP).find((key) =>
    normalized.includes(key)
  );
  return aliasKey ? AI_EMOJI_LOOKUP[aliasKey] : "🤖";
};

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
  // Load username from localStorage on mount and auto-join
  useEffect(() => {
    const savedUsername = localStorage.getItem("ai-chat-username");
    if (savedUsername) {
      setUsername(savedUsername);
      // Auto-join if we have a saved username and are connected
      if (connectionStatus.connected) {
        joinRoom(savedUsername, "default");
      }
    }
  }, []);

  // Auto-join when connection is established and we have a saved username
  useEffect(() => {
    const savedUsername = localStorage.getItem("ai-chat-username");
    if (
      savedUsername &&
      connectionStatus.connected &&
      !isJoined &&
      username === savedUsername
    ) {
      joinRoom(savedUsername, "default");
    }
  }, [connectionStatus.connected, isJoined, username]);

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

    if (messages.length > 0) {
      saveMessagesToStorage(messages);
    }
  }, [messages]);
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

  // Socket connection
  const {
    on,
    joinRoom,
    sendMessage,
    changeTopic,
    getRoomInfo,
    getAIStatus,
    adminWakeAIs,
    adminSleepAIs,
    triggerAI,
    startTyping,
    stopTyping,
  } = useSocket(SERVER_URL);

  useEffect(() => {
    usernameRef.current = username || "";
  }, [username]);

  useEffect(() => () => {
    toastTimeouts.current.forEach((timeoutId) => clearTimeout(timeoutId));
    toastTimeouts.current.clear();
  }, []);

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

    // Room events
    on("room-joined", (data) => {
      setIsJoined(true);
      setRoomInfo(data);
      setParticipants(data.participants || []);
      setError(null);
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
      joinRoom(username.trim(), "default");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("ai-chat-username");
    setUsername("");
    setIsJoined(false);
    setMessages([]);
    setTypingUsers([]);
    setTypingAIs([]);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const loginView = (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div className="flex bg-white rounded-3xl shadow-2xl max-w-6xl w-full max-h-[900px] overflow-hidden animate-scale-in border border-white/20 dark:bg-slate-900/90 dark:border-slate-800">
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-600/90 to-slate-700/90 backdrop-blur-sm text-white p-6 rounded-tl-3xl border-b border-white/10 dark:from-slate-800/90 dark:to-slate-900/90 dark:border-slate-800/60">
            <div className="flex justify-between items-stretch gap-6 flex-wrap">
              <div className="flex flex-col justify-center">
                <h1 className="header-title header-title--hero">AI Chat Realtime</h1>
                <div className="text-slate-300/90 text-xs uppercase tracking-[0.32em] mt-3">
                  Enter your username to join the conversation
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm self-stretch flex-wrap justify-end">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full transition-colors ${
                      connectionStatus.connected
                        ? "bg-green-400"
                        : "bg-red-400 animate-pulse"
                    }`}
                  ></div>
                  <span>
                    {connectionStatus.connected ? "Connected" : "Connecting..."}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white/80 text-xs font-medium transition-colors dark:border-slate-700 dark:bg-slate-900/50 dark:hover:bg-slate-900/70 dark:text-slate-200"
                    title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                  >
                    <Icon name={theme === "dark" ? "sun" : "moon"} className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {theme === "dark" ? "Light mode" : "Dark mode"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Welcome Content */}
          <div className="flex-1 flex flex-col justify-center items-center p-8 space-y-8">
            <div className="text-center space-y-4 animate-fade-in">
              <div className="text-4xl mb-4">🤖✨</div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                Welcome to AI Chat Realtime!
              </h2>
              <div className="text-slate-600 space-y-2 max-w-lg dark:text-slate-300">
                <p>
                  Join the conversation with AI personalities from different
                  providers.
                </p>
                <p>
                  Each AI has its own unique personality and communication
                  style.
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50/70 backdrop-blur-sm border border-red-200/50 text-red-800 px-6 py-4 rounded-2xl text-center animate-slide-up shadow-sm dark:bg-red-500/10 dark:border-red-400/40 dark:text-red-200">
                {error}
              </div>
            )}

            <form
              onSubmit={handleJoinRoom}
              className="w-full max-w-sm space-y-4 animate-slide-up"
            >
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username (will be saved)"
                maxLength={50}
                pattern="[a-zA-Z0-9_-]+"
                title="Username can only contain letters, numbers, dash, and underscore"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition-all placeholder-slate-400 dark:bg-slate-900/80 dark:border-slate-700 dark:text-slate-100 dark:placeholder-slate-500"
                required
              />
              <button
                type="submit"
                disabled={!connectionStatus.connected || !username.trim()}
                className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 px-6 rounded-xl font-semibold 
                         hover:from-primary-700 hover:to-primary-800 disabled:from-slate-300 disabled:to-slate-400 
                         disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 
                         shadow-lg hover:shadow-xl dark:disabled:from-slate-700 dark:disabled:to-slate-800"
              >
                Join Chat
              </button>
            </form>
          </div>
        </div>

        {/* Show participants list even on login screen */}
        <ParticipantsList
          participants={[]}
          aiParticipants={[]}
          typingUsers={[]}
          typingAIs={[]}
          isVisible={true}
        />
      </div>
    </div>
  );

  const chatView = (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-6 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
      <div className="flex bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden animate-fade-in border border-white/30 dark:bg-slate-900/90 dark:border-slate-800">
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-600/90 to-slate-700/90 backdrop-blur-sm text-white p-6 rounded-tl-3xl border-b border-white/10 dark:from-slate-800/90 dark:to-slate-900/90 dark:border-slate-800/60">
            <div className="flex justify-between items-stretch gap-6 flex-wrap">
              <div className="flex items-center gap-4 self-stretch">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Icon name="chat" className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col justify-center">
                  <h1 className="header-title header-title--compact">AI Chat Realtime</h1>
                  <div className="text-slate-300/90 text-xs uppercase tracking-[0.24em] mt-2 flex items-center gap-2">
                    <Icon name="topic" className="w-4 h-4" />
                    {roomInfo.topic} • {username}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 self-stretch flex-wrap justify-end">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="bg-white/10 hover:bg-white/20 text-white/80 px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 dark:bg-slate-900/60 dark:hover:bg-slate-900/80 dark:text-slate-200 dark:border dark:border-slate-700"
                    title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                  >
                    <Icon name={theme === "dark" ? "sun" : "moon"} className="w-4 h-4" />
                    <span className="hidden sm:inline">
                      {theme === "dark" ? "Light mode" : "Dark mode"}
                    </span>
                  </button>
                </div>
                <Link
                  to="/dashboard"
                  className="bg-primary-800 hover:bg-primary-900 text-primary-100 hover:text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-primary-800 hover:bg-primary-900 text-primary-100 hover:text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors"
                >
                  Logout
                </button>
                <div className="flex items-center gap-2 text-sm">
                  <div
                    className={`w-2 h-2 rounded-full transition-colors ${
                      connectionStatus.connected
                        ? "bg-green-400"
                        : "bg-red-400 animate-pulse"
                    }`}
                  ></div>
                  <span>
                    {connectionStatus.connected ? "Connected" : "Reconnecting..."}
                  </span>
                </div>
                <div className="text-primary-200 text-xs dark:text-slate-300">
                  {participants.length} user
                  {participants.length !== 1 ? "s" : ""} + 7 AIs
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto no-scrollbar p-8 space-y-7 bg-gradient-to-b from-slate-50/30 to-white/40 dark:from-slate-900/50 dark:to-slate-900/20"
            ref={messagesContainerRef}
          >
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicator */}
          <TypingIndicator
            typingUsers={typingUsers}
            typingAIs={typingAIs}
            isUserTyping={typingUsers.some((user) => user.isLocal)}
          />

          {/* Scroll to bottom button */}
          {showScrollButton && (
            <button
              className="fixed bottom-32 right-8 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 z-50 animate-bounce group dark:from-emerald-400 dark:to-teal-500"
              onClick={scrollToBottom}
            >
              <Icon
                name="arrow-down"
                className="w-5 h-5 transform group-hover:translate-y-1 transition-transform duration-200"
              />
            </button>
          )}

          {/* Input area */}
          <div className="border-t border-slate-100/50 bg-white/80 backdrop-blur-md p-8 space-y-6 rounded-bl-3xl dark:bg-slate-900/90 dark:border-slate-800/60">
            {error && (
              <div className="bg-red-50/70 backdrop-blur-sm border border-red-200/50 text-red-800 px-6 py-4 rounded-2xl text-center animate-slide-up shadow-sm dark:bg-red-500/10 dark:border-red-400/40 dark:text-red-200">
                {error}
              </div>
            )}

            {/* Message Input */}
            <MessageInput
              onSendMessage={handleSendMessage}
              onAIMention={handleAIMention}
              onTypingStart={startTyping}
              onTypingStop={stopTyping}
              disabled={!connectionStatus.connected}
            />
          </div>
        </div>

        {/* Participants List */}
        <ParticipantsList
          participants={participants}
          aiParticipants={[]}
          typingUsers={typingUsers}
          typingAIs={typingAIs}
          isVisible={true}
        />
      </div>
    </div>
  );


  function handleSendMessage(content) {
    sendMessage(content);
  }

  function handleTopicChange(newTopic) {
    changeTopic(newTopic);
  }

  function scrollToBottom() {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => setShowScrollButton(false), 500);
    }
  }

  function handleAdminWakeAIs() {
    adminWakeAIs();
  }

  function handleAdminSleepAIs() {
    adminSleepAIs();
  }

  function handleAIMention(mentions, message) {
    // Map mention names to actual AI names
    const aiMappings = {
      claude: "claude",
      anthropic: "claude",
      gpt: "gpt-4",
      gpt4: "gpt-4",
      "gpt-4": "gpt-4",
      openai: "gpt-4",
      chatgpt: "gpt-4",
      grok: "grok",
      xai: "grok",
      gemini: "gemini",
      google: "gemini",
      bard: "gemini",
      command: "cohere",
      commandr: "cohere",
      cohere: "cohere",
      mistral: "mistral",
      "z.ai": "z.ai",
      z: "z.ai",
      zai: "z.ai",
    };

    const aiNames = mentions
      .map((mention) => aiMappings[mention.toLowerCase()] || mention)
      .filter((name, index, arr) => arr.indexOf(name) === index); // Remove duplicates

    if (aiNames.length > 0) {
      // Send recent chat context along with the trigger
      const recentMessages = messages.slice(-10); // Last 10 messages for context
      triggerAI(aiNames, message, recentMessages);
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {isJoined ? chatView : loginView}
      <ToastContainer toasts={toasts} />
    </ThemeContext.Provider>
  );

}

export default App;
