import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MessageInput from "./MessageInput.jsx";

vi.mock("./AISelectionDialog.jsx", () => ({
  default: ({ searchTerm }) => (
    <div data-testid="ai-selection-dialog">search:{searchTerm}</div>
  ),
}));

vi.mock("./Icon.jsx", () => ({
  default: ({ name }) => <span data-testid={`icon-${name}`}>icon-{name}</span>,
}));

describe("MessageInput", () => {
  const defaultProps = {
    onSendMessage: vi.fn(),
    onAIMention: vi.fn(),
    onTypingStart: vi.fn(),
    onTypingStop: vi.fn(),
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows AI selection dialog while typing an @mention", () => {
    render(<MessageInput {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(
      /Use @ to mention an AI/i
    );

    fireEvent.change(textarea, { target: { value: "@Gr", selectionStart: 3 } });

    const dialog = screen.getByTestId("ai-selection-dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent("search:Gr");
  });
});
