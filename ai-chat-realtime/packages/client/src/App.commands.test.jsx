import React from "react";
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
} from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { act } from "react-dom/test-utils";

const listeners = {};
const sendMessageMock = vi.fn();

vi.mock("./hooks/useSocket", () => ({
  useSocket: () => ({
    on: (event, callback) => {
      listeners[event] = callback;
    },
    joinRoom: vi.fn(),
    sendMessage: sendMessageMock,
    triggerAI: vi.fn(),
    startTyping: vi.fn(),
    stopTyping: vi.fn(),
  }),
}));

vi.mock("./components/ToastContainer.jsx", () => ({
  default: () => <div data-testid="toast-container" />,
}));

vi.mock("./components/LoginView.jsx", () => ({
  default: () => <div data-testid="login-view" />,
}));

vi.mock("./components/LoadingOverlay.jsx", () => ({
  default: ({ visible }) =>
    visible ? <div data-testid="loading-overlay">Loading</div> : null,
}));

vi.mock("./components/ChatView.jsx", () => ({
  default: ({ messages, onSendMessage }) => (
    <div data-testid="chat-view">
      <span data-testid="message-count">{messages.length}</span>
      <button
        type="button"
        data-testid="command-clear"
        onClick={() => onSendMessage("/clear")}
      >
        Clear
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

import App from "./App.jsx";

describe("App command handling", () => {
  beforeAll(() => {
    if (!window.matchMedia) {
      Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
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
    sendMessageMock.mockReset();
    for (const key of Object.keys(listeners)) {
      delete listeners[key];
    }
    localStorage.clear();
  });

  const triggerEvent = async (event, payload) => {
    await waitFor(() => {
      expect(typeof listeners[event]).toBe("function");
    });
    await act(async () => {
      listeners[event](payload);
    });
  };

  const joinRoomWithMessages = async (messages = []) => {
    await triggerEvent("recent-messages", { messages, participants: [] });
    await triggerEvent("room-joined", {
      participants: [],
      topic: "General discussion",
    });
    await waitFor(() => {
      expect(screen.getByTestId("chat-view")).toBeInTheDocument();
    });
  };

  it("handles the /clear command locally", async () => {
    const storedMessages = [
      { id: "1", content: "Stored message" },
    ];
    localStorage.setItem("ai-chat-messages", JSON.stringify(storedMessages));

    render(<App />);

    await joinRoomWithMessages(storedMessages);

    await waitFor(() => {
      expect(screen.getByTestId("message-count")).toHaveTextContent("1");
    });

    fireEvent.click(screen.getByTestId("command-clear"));

    expect(sendMessageMock).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(screen.getByTestId("message-count")).toHaveTextContent("0");
    });

    expect(localStorage.getItem("ai-chat-messages")).toBeNull();
  });

  it("sends non-command messages through the socket", async () => {
    render(<App />);

    await joinRoomWithMessages();

    fireEvent.click(screen.getByTestId("send-message"));

    expect(sendMessageMock).toHaveBeenCalledWith("hello");
  });
});
