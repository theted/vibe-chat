import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MessageInput from "./MessageInput";

vi.mock("./AISelectionDialog", () => ({
  default: ({ searchTerm }: { searchTerm: string }) => (
    <div data-testid="ai-selection-dialog">search:{searchTerm}</div>
  ),
}));

vi.mock("./Icon", () => ({
  default: ({ name }: { name: string }) => (
    <span data-testid={`icon-${name}`}>icon-{name}</span>
  ),
}));

describe("MessageInput", () => {
  const defaultProps = {
    onSendMessage: vi.fn(),
    onTypingStart: vi.fn(),
    onTypingStop: vi.fn(),
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("quote-replies", () => {
    const replyingTo = {
      id: "m1",
      senderType: "user" as const,
      sender: "Skylar",
      content: "Tabs or spaces?",
      timestamp: Date.now(),
    };

    it("shows who is being replied to", () => {
      render(<MessageInput {...defaultProps} replyingTo={replyingTo} />);

      expect(screen.getByText("Replying to")).toBeInTheDocument();
      expect(screen.getByText("Skylar")).toBeInTheDocument();
      expect(screen.getByText("Tabs or spaces?")).toBeInTheDocument();
    });

    it("cancels with Escape or the close button", () => {
      const onCancelReply = vi.fn();
      render(
        <MessageInput
          {...defaultProps}
          replyingTo={replyingTo}
          onCancelReply={onCancelReply}
        />,
      );

      fireEvent.keyDown(screen.getByPlaceholderText(/@ to mention AI/i), {
        key: "Escape",
      });
      fireEvent.click(screen.getByRole("button", { name: "Cancel reply" }));

      expect(onCancelReply).toHaveBeenCalledTimes(2);
    });
  });

  it("shows AI selection dialog while typing an @mention", () => {
    render(<MessageInput {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/@ to mention AI/i);

    fireEvent.change(textarea, { target: { value: "@Gr", selectionStart: 3 } });

    const dialog = screen.getByTestId("ai-selection-dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent("search:Gr");
  });

  it("opens the AI selection dialog even if selectionStart is unavailable", () => {
    render(<MessageInput {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/@ to mention AI/i);

    fireEvent.change(textarea, { target: { value: "@gr" } });

    expect(screen.getByTestId("ai-selection-dialog")).toHaveTextContent(
      "search:gr",
    );
  });

  it("opens the AI selection dialog when selectionEnd is available", () => {
    render(<MessageInput {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(/@ to mention AI/i);

    fireEvent.change(textarea, {
      target: { value: "@gra", selectionStart: null, selectionEnd: 4 },
    });

    expect(screen.getByTestId("ai-selection-dialog")).toHaveTextContent(
      "search:gra",
    );
  });
});
