import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ChatView from "./ChatView";
import type { RefObject, ReactNode } from "react";
import type { AiParticipant } from "@/config/aiParticipants";

const { mockDefaultAiParticipants } = vi.hoisted(() => ({
  mockDefaultAiParticipants: Array.from({ length: 11 }, (_, index) => ({
    id: `ai-${index}`,
    name: `AI ${index}`,
    alias: `ai-${index}`,
    provider: "Test Provider",
    status: "active" as const,
    emoji: "🤖",
  })),
}));

vi.mock("react-router-dom", () => ({
  BrowserRouter: ({ children }: { children: ReactNode }) => (
    <div data-testid="router">{children}</div>
  ),
  Link: ({ to, children, ...rest }: { to: string; children: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("./ChatMessage", () => ({
  default: ({ message }: { message: { text: string } }) => (
    <div data-testid="chat-message">{message.text}</div>
  ),
}));

vi.mock("./MessageInput", () => ({
  default: ({
    onSendMessage,
    disabled,
  }: {
    onSendMessage: (msg: string) => void;
    disabled: boolean;
  }) => (
    <div data-testid="message-input">
      <button onClick={() => onSendMessage("test")} disabled={disabled}>
        Send
      </button>
    </div>
  ),
}));

vi.mock("./ParticipantsList", () => ({
  default: ({
    participants,
    aiParticipants = [],
  }: {
    participants: unknown[];
    aiParticipants?: unknown[];
  }) => (
    <div data-testid="participants-list">
      {participants.length} participants, {aiParticipants.length} AIs
    </div>
  ),
}));

vi.mock("@/config/aiParticipants", () => ({
  DEFAULT_AI_PARTICIPANTS: mockDefaultAiParticipants,
}));

vi.mock("./TypingIndicator", () => ({
  default: ({
    typingUsers,
    typingAIs,
  }: {
    typingUsers: unknown[];
    typingAIs: unknown[];
  }) => (
    <div data-testid="typing-indicator">
      {typingUsers.length} users, {typingAIs.length} AIs typing
    </div>
  ),
}));

vi.mock("./Icon", () => ({
  default: ({ name, className }: { name: string; className?: string }) => (
    <span data-testid={`icon-${name}`} className={className}>
      Icon-{name}
    </span>
  ),
}));

describe("ChatView Component", () => {
  const defaultProps = {
    theme: "light" as const,
    toggleTheme: vi.fn(),
    connectionStatus: { connected: true },
    roomInfo: { topic: "General Chat" },
    username: "testuser",
    participants: [{ username: "user1" }, { username: "user2" }],
    messages: [
      {
        id: "1",
        text: "Hello",
        sender: "user1",
        senderType: "user" as const,
        content: "Hello",
        timestamp: Date.now(),
      },
      {
        id: "2",
        text: "Hi there",
        sender: "user2",
        senderType: "user" as const,
        content: "Hi there",
        timestamp: Date.now(),
      },
    ],
    typingUsers: [],
    typingAIs: [],
    showScrollButton: false,
    onScrollToBottom: vi.fn(),
    onLogout: vi.fn(),
    onSendMessage: vi.fn(),
    onAIMention: vi.fn(),
    onTypingStart: vi.fn(),
    onTypingStop: vi.fn(),
    error: null,
    messagesEndRef: { current: null } as RefObject<HTMLDivElement | null>,
    messagesContainerRef: { current: null } as RefObject<HTMLDivElement | null>,
  };

  const renderWithRouter = (component: ReactNode) =>
    render(<BrowserRouter>{component}</BrowserRouter>);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render without crashing", () => {
      renderWithRouter(<ChatView {...defaultProps} />);
      expect(screen.getByText(/vibe chat/i)).toBeInTheDocument();
    });

    it("should display username and topic", () => {
      renderWithRouter(<ChatView {...defaultProps} />);
      expect(screen.getByText(/testuser/)).toBeInTheDocument();
      expect(screen.getByText(/General Chat/)).toBeInTheDocument();
    });

    it("should render all messages", () => {
      renderWithRouter(<ChatView {...defaultProps} />);
      const messages = screen.getAllByTestId("chat-message");
      expect(messages).toHaveLength(2);
    });

    it("should display participant count", () => {
      renderWithRouter(<ChatView {...defaultProps} />);
      expect(screen.getByText(/2 users \+ 11 AIs/)).toBeInTheDocument();
    });
  });

  describe("connection status", () => {
    it('should show "Connected" when connected', () => {
      renderWithRouter(<ChatView {...defaultProps} />);
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });

    it('should show "Reconnecting..." when disconnected', () => {
      const props = { ...defaultProps, connectionStatus: { connected: false } };
      renderWithRouter(<ChatView {...props} />);
      expect(screen.getByText("Reconnecting...")).toBeInTheDocument();
    });
  });

  describe("theme toggle", () => {
    it("should call toggleTheme when theme button clicked", () => {
      renderWithRouter(<ChatView {...defaultProps} />);
      fireEvent.click(screen.getByLabelText("Open settings menu"));
      const themeButton = screen.getByTitle(/Switch to dark mode/);
      fireEvent.click(themeButton);
      expect(defaultProps.toggleTheme).toHaveBeenCalledTimes(1);
    });

    it("should show moon icon in light mode", () => {
      renderWithRouter(<ChatView {...defaultProps} />);
      fireEvent.click(screen.getByLabelText("Open settings menu"));
      expect(screen.getByTestId("icon-moon")).toBeInTheDocument();
    });

    it("should show sun icon in dark mode", () => {
      const props = { ...defaultProps, theme: "dark" as const };
      renderWithRouter(<ChatView {...props} />);
      fireEvent.click(screen.getByLabelText("Open settings menu"));
      expect(screen.getByTestId("icon-sun")).toBeInTheDocument();
    });
  });

  describe("user actions", () => {
    it("should call onLogout when logout button clicked", () => {
      renderWithRouter(<ChatView {...defaultProps} />);
      fireEvent.click(screen.getByLabelText("Open settings menu"));
      const logoutButton = screen.getByLabelText("Logout");
      fireEvent.click(logoutButton);
      expect(defaultProps.onLogout).toHaveBeenCalledTimes(1);
    });

    it("should navigate to dashboard when dashboard link clicked", () => {
      renderWithRouter(<ChatView {...defaultProps} />);
      fireEvent.click(screen.getByLabelText("Open settings menu"));
      const dashboardLink = screen.getByLabelText("Dashboard");
      expect(dashboardLink).toHaveAttribute("href", "/dashboard");
    });
  });

  describe("scroll button", () => {
    it("should show scroll button when showScrollButton is true", () => {
      const props = { ...defaultProps, showScrollButton: true };
      renderWithRouter(<ChatView {...props} />);
      const scrollButton = screen
        .getByTestId("icon-arrow-down")
        .closest("button");
      expect(scrollButton).toBeInTheDocument();
    });

    it("should call onScrollToBottom when scroll button clicked", () => {
      const props = { ...defaultProps, showScrollButton: true };
      renderWithRouter(<ChatView {...props} />);
      const scrollButton = screen
        .getByTestId("icon-arrow-down")
        .closest("button");
      fireEvent.click(scrollButton!);
      expect(defaultProps.onScrollToBottom).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling", () => {
    it("should display error message when error exists", () => {
      const props = {
        ...defaultProps,
        error: "Connection failed. Please try again.",
      };
      renderWithRouter(<ChatView {...props} />);
      expect(
        screen.getByText("Connection failed. Please try again."),
      ).toBeInTheDocument();
    });
  });

  describe("participants", () => {
    it("should display correct singular form for 1 user", () => {
      const props = {
        ...defaultProps,
        participants: [{ username: "user1" }],
      };
      renderWithRouter(<ChatView {...props} />);
      expect(screen.getByText(/1 user \+ 11 AIs/)).toBeInTheDocument();
    });

    it("should display correct plural form for multiple users", () => {
      renderWithRouter(<ChatView {...defaultProps} />);
      expect(screen.getByText(/2 users \+ 11 AIs/)).toBeInTheDocument();
    });
  });

  describe("message input integration", () => {
    it("should pass onSendMessage to MessageInput", () => {
      renderWithRouter(<ChatView {...defaultProps} />);
      const sendButton = screen.getByText("Send");
      fireEvent.click(sendButton);
      expect(defaultProps.onSendMessage).toHaveBeenCalledWith("test");
    });

    it("should disable input when not connected", () => {
      const props = { ...defaultProps, connectionStatus: { connected: false } };
      renderWithRouter(<ChatView {...props} />);
      const sendButton = screen.getByText("Send");
      expect(sendButton).toBeDisabled();
    });
  });
});
