import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginView from "./LoginView";
import type { FormEvent } from 'react';

vi.mock("./ParticipantsList", () => ({
  default: () => <div data-testid="participants-list">Participants</div>,
}));

vi.mock("./Icon", () => ({
  default: ({ name }: { name: string }) => <span data-testid={`icon-${name}`}>Icon-{name}</span>,
}));

describe("LoginView Component", () => {
  const defaultProps = {
    connectionStatus: { connected: true },
    toggleTheme: vi.fn(),
    theme: "light" as const,
    username: "",
    onUsernameChange: vi.fn(),
    onJoin: vi.fn(),
    error: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("should render without crashing", () => {
      render(<LoginView {...defaultProps} />);
      expect(screen.getByText(/vibe chat/i)).toBeInTheDocument();
    });

    it("should display immersive welcome copy", () => {
      render(<LoginView {...defaultProps} />);
      expect(screen.getByText(/group chat with ai's/i)).toBeInTheDocument();
    });

    it("should highlight realtime conversation description", () => {
      render(<LoginView {...defaultProps} />);
      expect(screen.getByText(/join chat/i)).toBeInTheDocument();
    });

    it("should render username input field", () => {
      render(<LoginView {...defaultProps} />);
      const input = screen.getByPlaceholderText(/Enter your username/);
      expect(input).toBeInTheDocument();
    });

    it("should render join button", () => {
      render(<LoginView {...defaultProps} />);
      const button = screen.getByText("Join Chat");
      expect(button).toBeInTheDocument();
    });
  });

  describe("connection status", () => {
    it('should show "Connected" when connected', () => {
      render(<LoginView {...defaultProps} />);
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });

    it('should show "Connecting..." when disconnected', () => {
      const props = { ...defaultProps, connectionStatus: { connected: false } };
      render(<LoginView {...props} />);
      expect(screen.getByText("Connecting...")).toBeInTheDocument();
    });
  });

  describe("theme toggle", () => {
    it("should call toggleTheme when theme button clicked", () => {
      render(<LoginView {...defaultProps} />);
      const themeButton = screen.getByTitle(/Switch to dark mode/);
      fireEvent.click(themeButton);
      expect(defaultProps.toggleTheme).toHaveBeenCalledTimes(1);
    });

    it("should show moon icon in light mode", () => {
      render(<LoginView {...defaultProps} />);
      expect(screen.getByTestId("icon-moon")).toBeInTheDocument();
    });

    it("should show sun icon in dark mode", () => {
      const props = { ...defaultProps, theme: "dark" as const };
      render(<LoginView {...props} />);
      expect(screen.getByTestId("icon-sun")).toBeInTheDocument();
    });
  });

  describe("username input", () => {
    it("should display current username value", () => {
      const props = { ...defaultProps, username: "testuser" };
      render(<LoginView {...props} />);
      const input = screen.getByPlaceholderText(/Enter your username/);
      expect(input).toHaveValue("testuser");
    });

    it("should call onUsernameChange when input changes", async () => {
      const user = userEvent.setup();
      render(<LoginView {...defaultProps} />);
      const input = screen.getByPlaceholderText(/Enter your username/);
      await user.type(input, "newuser");
      expect(defaultProps.onUsernameChange).toHaveBeenCalled();
    });

    it("should have maxLength of 50", () => {
      render(<LoginView {...defaultProps} />);
      const input = screen.getByPlaceholderText(/Enter your username/);
      expect(input).toHaveAttribute("maxLength", "50");
    });

    it("should have pattern for valid characters", () => {
      render(<LoginView {...defaultProps} />);
      const input = screen.getByPlaceholderText(/Enter your username/);
      expect(input).toHaveAttribute("pattern", "[a-zA-Z0-9_-]+");
    });

    it("should be required", () => {
      render(<LoginView {...defaultProps} />);
      const input = screen.getByPlaceholderText(/Enter your username/);
      expect(input).toBeRequired();
    });
  });

  describe("join button", () => {
    it("should be disabled when not connected", () => {
      const props = { ...defaultProps, connectionStatus: { connected: false } };
      render(<LoginView {...props} />);
      const button = screen.getByRole("button", { name: /join chat/i });
      expect(button).toBeDisabled();
    });

    it("should be disabled when username is empty", () => {
      const props = { ...defaultProps, username: "" };
      render(<LoginView {...props} />);
      const button = screen.getByRole("button", { name: /join chat/i });
      expect(button).toBeDisabled();
    });

    it("should be disabled when username is only whitespace", () => {
      const props = { ...defaultProps, username: "   " };
      render(<LoginView {...props} />);
      const button = screen.getByRole("button", { name: /join chat/i });
      expect(button).toBeDisabled();
    });

    it("should be enabled when connected and username is valid", () => {
      const props = { ...defaultProps, username: "testuser" };
      render(<LoginView {...props} />);
      const button = screen.getByRole("button", { name: /join chat/i });
      expect(button).not.toBeDisabled();
    });

    it("should call onJoin when form is submitted", () => {
      const props = { ...defaultProps, username: "testuser" };
      render(<LoginView {...props} />);
      const button = screen.getByRole("button", { name: /join chat/i });
      fireEvent.click(button);
      expect(defaultProps.onJoin).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling", () => {
    it("should display error message when error exists", () => {
      const props = { ...defaultProps, error: "Username already taken" };
      render(<LoginView {...props} />);
      expect(screen.getByText("Username already taken")).toBeInTheDocument();
    });

    it("should display different error messages", () => {
      const { rerender } = render(
        <LoginView {...defaultProps} error="Error 1" />
      );
      expect(screen.getByText("Error 1")).toBeInTheDocument();
      rerender(<LoginView {...defaultProps} error="Error 2" />);
      expect(screen.getByText("Error 2")).toBeInTheDocument();
      expect(screen.queryByText("Error 1")).not.toBeInTheDocument();
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete user flow", async () => {
      const user = userEvent.setup();
      const onUsernameChange = vi.fn();
      const onJoin = vi.fn();
      const props = { ...defaultProps, onUsernameChange, onJoin };
      const { rerender } = render(<LoginView {...props} />);
      const input = screen.getByPlaceholderText(/Enter your username/);
      await user.type(input, "testuser");
      expect(onUsernameChange).toHaveBeenCalled();
      rerender(<LoginView {...props} username="testuser" />);
      const button = screen.getByRole("button", { name: /join chat/i });
      expect(button).not.toBeDisabled();
      fireEvent.click(button);
      expect(onJoin).toHaveBeenCalledTimes(1);
    });

    it("should handle disconnection during input", () => {
      const props = {
        ...defaultProps,
        connectionStatus: { connected: true },
        username: "testuser",
      };
      const { rerender } = render(<LoginView {...props} />);
      let button = screen.getByRole("button", { name: /join chat/i });
      expect(button).not.toBeDisabled();
      rerender(
        <LoginView {...props} connectionStatus={{ connected: false }} />
      );
      button = screen.getByRole("button", { name: /join chat/i });
      expect(button).toBeDisabled();
      expect(screen.getByText("Connecting...")).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("should handle rapid theme toggles", () => {
      const toggleTheme = vi.fn();
      render(<LoginView {...defaultProps} toggleTheme={toggleTheme} />);
      const themeButton = screen.getByTitle(/Switch to dark mode/);
      fireEvent.click(themeButton);
      fireEvent.click(themeButton);
      fireEvent.click(themeButton);
      expect(toggleTheme).toHaveBeenCalledTimes(3);
    });

    it("should handle long usernames within limit", () => {
      const longUsername = "a".repeat(50);
      const props = { ...defaultProps, username: longUsername };
      render(<LoginView {...props} />);
      const input = screen.getByPlaceholderText(/Enter your username/);
      expect(input).toHaveValue(longUsername);
    });
  });
});
