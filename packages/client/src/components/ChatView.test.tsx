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
  default: ({
    message,
    onReply,
  }: {
    message: { id: string; text: string };
    onReply?: (message: { id: string }) => void;
  }) => (
    <div data-testid="chat-message">
      {message.text}
      {onReply && (
        <button onClick={() => onReply(message)}>reply-{message.id}</button>
      )}
    </div>
  ),
}));

vi.mock("./MessageInput", () => ({
  default: ({
    onSendMessage,
    disabled,
    replyingTo,
    onCancelReply,
  }: {
    onSendMessage: (msg: string) => void;
    disabled: boolean;
    replyingTo?: { id: string } | null;
    onCancelReply?: () => void;
  }) => (
    <div data-testid="message-input">
      {replyingTo && <span>replying-to-{replyingTo.id}</span>}
      <button onClick={onCancelReply}>Cancel reply</button>
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
    isAuthenticated: true,
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
    onJoin: vi.fn(),
    onUsernameChange: vi.fn(),
    onSendMessage: vi.fn(),
    onTypingStart: vi.fn(),
    onTypingStop: vi.fn(),
    onPrivateConversationStart: vi.fn(),
    error: null,
    messagesEndRef: { current: null } as RefObject<HTMLDivElement | null>,
    messagesContainerRef: { current: null } as RefObject<HTMLDivElement | null>,
  };

  describe("private chat", () => {
    const privateAi: AiParticipant = {
      id: "ai-3",
      name: "AI 3",
      alias: "ai-3",
      provider: "Test Provider",
      status: "active",
      emoji: "🛰️",
    };

    it("hides the private-chat banner in the main room", () => {
      renderWithRouter(<ChatView {...defaultProps} />);

      expect(screen.queryByTestId("private-chat-banner")).toBeNull();
    });

    it("names the model while in a private chat", () => {
      renderWithRouter(
        <ChatView
          {...defaultProps}
          isPrivateChat
          privateChatAi={privateAi}
          onPrivateConversationEnd={vi.fn()}
        />,
      );

      const banner = screen.getByTestId("private-chat-banner");
      expect(banner.textContent).toContain("Private chat");
      expect(banner.textContent).toContain("AI 3");
    });

    it("leaves the private chat when the back button is clicked", () => {
      const onPrivateConversationEnd = vi.fn();
      renderWithRouter(
        <ChatView
          {...defaultProps}
          isPrivateChat
          privateChatAi={privateAi}
          onPrivateConversationEnd={onPrivateConversationEnd}
        />,
      );

      fireEvent.click(screen.getByTestId("leave-private-chat"));

      expect(onPrivateConversationEnd).toHaveBeenCalledTimes(1);
    });
  });

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

    it("should render all messages", () => {
      renderWithRouter(<ChatView {...defaultProps} />);
      const messages = screen.getAllByTestId("chat-message");
      expect(messages).toHaveLength(2);
    });

    it("should display participant count", () => {
      renderWithRouter(<ChatView {...defaultProps} />);
      expect(screen.getByText("2 participants, 11 AIs")).toBeInTheDocument();
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
      expect(screen.getByText("1 participants, 11 AIs")).toBeInTheDocument();
    });

    it("should display correct plural form for multiple users", () => {
      renderWithRouter(<ChatView {...defaultProps} />);
      expect(screen.getByText("2 participants, 11 AIs")).toBeInTheDocument();
    });
  });

  describe("message input integration", () => {
    it("should pass onSendMessage to MessageInput", () => {
      renderWithRouter(<ChatView {...defaultProps} />);
      const sendButton = screen.getByText("Send");
      fireEvent.click(sendButton);
      expect(defaultProps.onSendMessage).toHaveBeenCalledWith("test");
    });

    it("sends a quote-reply with the quoted message's id, then clears it", () => {
      renderWithRouter(<ChatView {...defaultProps} />);

      fireEvent.click(screen.getByText("reply-2"));
      expect(screen.getByText("replying-to-2")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Send"));
      expect(defaultProps.onSendMessage).toHaveBeenCalledWith("test", "2");
      expect(screen.queryByText("replying-to-2")).toBeNull();
    });

    it("cancels a quote-reply", () => {
      renderWithRouter(<ChatView {...defaultProps} />);

      fireEvent.click(screen.getByText("reply-1"));
      fireEvent.click(screen.getByText("Cancel reply"));
      fireEvent.click(screen.getByText("Send"));

      expect(defaultProps.onSendMessage).toHaveBeenCalledWith("test");
    });

    it("offers no reply buttons to guests", () => {
      renderWithRouter(<ChatView {...defaultProps} isAuthenticated={false} />);
      expect(screen.queryByText("reply-1")).toBeNull();
    });

    it("should disable input when not connected", () => {
      const props = { ...defaultProps, connectionStatus: { connected: false } };
      renderWithRouter(<ChatView {...props} />);
      const sendButton = screen.getByText("Send");
      expect(sendButton).toBeDisabled();
    });
  });
});
