import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { act } from "react-dom/test-utils";
import { getParticipantById } from "./config/aiParticipants";
import type { AiParticipant } from "./config/aiParticipants";
import type { Message } from "./types";
import { AUTH_LOADING_TIMEOUT_MS } from "./constants/chat";

const listeners: Record<string, (data: unknown) => void> = {};
const emitMock = vi.fn();

vi.mock("./hooks/useSocket", () => ({
  useSocket: () => ({
    on: (event: string, callback: (data: unknown) => void) => {
      listeners[event] = callback;
    },
    off: vi.fn(),
    emit: emitMock,
  }),
}));

vi.mock("./components/ToastContainer", () => ({
  default: () => <div data-testid="toast-container" />,
}));

vi.mock("./components/LoginView", () => ({
  default: () => <div data-testid="login-view" />,
}));

vi.mock("./components/LoadingOverlay", () => ({
  default: ({ visible }: { visible: boolean }) =>
    visible ? <div data-testid="loading-overlay">Loading</div> : null,
}));

vi.mock("./components/ChatView", () => ({
  default: ({
    messages,
    onSendMessage,
    aiParticipants,
  }: {
    messages: Message[];
    onSendMessage: (msg: string) => void;
    // null until the server reports its roster; the real ChatView substitutes
    // the bundled catalogue as a placeholder in that window
    aiParticipants: AiParticipant[] | null;
  }) => (
    <div data-testid="chat-view">
      <span data-testid="message-count">{messages.length}</span>
      <span data-testid="last-message">
        {messages[messages.length - 1]?.content}
      </span>
      <span data-testid="ai-count">{aiParticipants?.length ?? "pending"}</span>
      <button
        type="button"
        data-testid="command-clear"
        onClick={() => onSendMessage("/clear")}
      >
        Clear
      </button>
      <button
        type="button"
        data-testid="command-debug"
        onClick={() => onSendMessage("/debug")}
      >
        Debug
      </button>
      <button
        type="button"
        data-testid="command-unknown"
        onClick={() => onSendMessage("/shrug")}
      >
        Shrug
      </button>
      <button
        type="button"
        data-testid="send-message"
        onClick={() => onSendMessage("hello")}
      >
        Send
      </button>
    </div>
  ),
}));

import App from "./App";

describe("App command handling", () => {
  beforeAll(() => {
    if (!window.matchMedia) {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
    }
  });

  beforeEach(() => {
    emitMock.mockReset();
    for (const key of Object.keys(listeners)) {
      delete listeners[key];
    }
    localStorage.clear();
  });

  const triggerEvent = async (event: string, payload: unknown) => {
    await waitFor(() => {
      expect(typeof listeners[event]).toBe("function");
    });
    await act(async () => {
      listeners[event](payload);
    });
  };

  const joinRoomWithMessages = async (
    messages: Message[] = [],
    aiParticipants: AiParticipant[] = [],
  ) => {
    await triggerEvent("recent-messages", { messages, participants: [] });
    await triggerEvent("room-joined", {
      participants: [],
      aiParticipants,
      topic: "General discussion",
    });
    await waitFor(() => {
      expect(screen.getByTestId("chat-view")).toBeInTheDocument();
    });
  };

  it("has the server clear the room, and empties it when told", async () => {
    const storedMessages: Message[] = [
      {
        id: "1",
        content: "Stored message",
        sender: "test",
        senderType: "user",
        timestamp: Date.now(),
      },
    ];
    localStorage.setItem("ai-chat-messages", JSON.stringify(storedMessages));

    render(<App />);

    await joinRoomWithMessages(storedMessages);

    await waitFor(() => {
      expect(screen.getByTestId("message-count")).toHaveTextContent("1");
    });

    fireEvent.click(screen.getByTestId("command-clear"));

    expect(emitMock).toHaveBeenCalledWith("clear-room");
    expect(emitMock).not.toHaveBeenCalledWith(
      "user-message",
      expect.anything(),
    );
    // Nothing goes until the server says the room was cleared
    expect(screen.getByTestId("message-count")).toHaveTextContent("1");

    await triggerEvent("room-cleared", {
      roomId: "default",
      by: "Ada",
      timestamp: Date.now(),
    });

    await waitFor(() => {
      expect(screen.getByTestId("last-message")).toHaveTextContent(
        "Ada cleared the chat",
      );
    });
    expect(screen.getByTestId("message-count")).toHaveTextContent("1");
    expect(localStorage.getItem("ai-chat-messages")).not.toContain(
      "Stored message",
    );
  });

  it("shows the server's answer to /debug in the prompt viewer", async () => {
    render(<App />);
    await joinRoomWithMessages();

    fireEvent.click(screen.getByTestId("command-debug"));
    expect(emitMock).toHaveBeenCalledWith("get-last-prompt");

    await triggerEvent("last-prompt", {
      roomId: "default",
      prompt: {
        roomId: "default",
        aiId: "claude",
        aiName: "Claude",
        modelId: "claude-test",
        reply: "Hi there.",
        messages: [
          { role: "system", content: "Be brief." },
          { role: "user", content: "[#1 Ada (human)] hello" },
        ],
        createdAt: Date.now(),
      },
    });

    const viewer = await screen.findByRole("dialog", {
      name: "Prompt behind Claude's reply",
    });
    expect(viewer).toHaveTextContent("Be brief.");
    expect(viewer).toHaveTextContent("[#1 Ada (human)] hello");
    expect(viewer).toHaveTextContent("Hi there.");
  });

  it("doesn't post an unknown command as a message", async () => {
    render(<App />);
    await joinRoomWithMessages();
    emitMock.mockClear();

    fireEvent.click(screen.getByTestId("command-unknown"));

    expect(emitMock).not.toHaveBeenCalled();
  });

  it("sends non-command messages through the socket", async () => {
    render(<App />);

    await joinRoomWithMessages();

    fireEvent.click(screen.getByTestId("send-message"));

    expect(emitMock).toHaveBeenCalledWith("user-message", { content: "hello" });
  });

  it("uses server AI participants for chat view", async () => {
    render(<App />);

    const gpt5Participant = getParticipantById("OPENAI_GPT5_5");
    if (!gpt5Participant) {
      throw new Error("Missing OPENAI_GPT5_5 participant fixture");
    }

    await joinRoomWithMessages([], [gpt5Participant]);

    await waitFor(() => {
      expect(screen.getByTestId("ai-count")).toHaveTextContent("1");
    });
  });
  it("falls through to the app when the join never comes back", async () => {
    vi.useFakeTimers();
    try {
      localStorage.setItem("ai-chat-username", "saved-user");
      render(<App />);

      // Auto-join is emitted but the server never answers room-joined
      expect(screen.queryByTestId("chat-view")).toBeNull();

      await act(async () => {
        vi.advanceTimersByTime(AUTH_LOADING_TIMEOUT_MS);
      });

      expect(screen.getByTestId("chat-view")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
      localStorage.clear();
    }
  });
});
