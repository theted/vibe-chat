/**
 * The first-use @Chat tip inside the composer: when it shows, the ways it
 * goes away, and that it never gets in the way of typing or sending.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { STORAGE_KEYS } from "@/constants/storage";
import MessageInput from "./MessageInput";

vi.mock("./AISelectionDialog", () => ({
  default: () => <div data-testid="ai-selection-dialog" />,
}));

const TIP_NAME = "About @Chat";

const renderInput = () => {
  const onSendMessage = vi.fn();
  render(<MessageInput onSendMessage={onSendMessage} />);
  return {
    onSendMessage,
    textarea: screen.getByRole("textbox", { name: "Message" }),
  };
};

describe("MessageInput @Chat tip", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows on first focus, explaining @Chat, without taking focus", () => {
    const { textarea } = renderInput();

    const tip = screen.getByRole("status", { name: TIP_NAME });
    expect(tip).toHaveTextContent(/@Chat/);
    expect(tip).toHaveTextContent(/code/);
    expect(tip).toHaveTextContent(/web/);
    expect(tip).toHaveTextContent(/GitHub issue/);
    expect(tip.textContent).not.toContain("—");
    expect(textarea).toHaveFocus();
  });

  it("dismisses with the close button, returns focus, and stays gone", () => {
    const { textarea } = renderInput();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss @Chat tip" }));

    expect(screen.queryByRole("status", { name: TIP_NAME })).toBeNull();
    expect(textarea).toHaveFocus();
    expect(localStorage.getItem(STORAGE_KEYS.CHAT_TIP_SEEN)).not.toBeNull();
  });

  it("does not come back once dismissed", () => {
    localStorage.setItem(STORAGE_KEYS.CHAT_TIP_SEEN, "1");
    renderInput();

    expect(screen.queryByRole("status", { name: TIP_NAME })).toBeNull();
  });

  it("dismisses on Escape in the textarea", () => {
    const { textarea } = renderInput();

    fireEvent.keyDown(textarea, { key: "Escape" });

    expect(screen.queryByRole("status", { name: TIP_NAME })).toBeNull();
  });

  it("takes the first Escape before a reply being written", () => {
    const onCancelReply = vi.fn();
    render(
      <MessageInput
        onSendMessage={vi.fn()}
        onCancelReply={onCancelReply}
        replyingTo={{
          id: "m1",
          senderType: "user",
          sender: "Skylar",
          content: "Tabs or spaces?",
          timestamp: Date.now(),
        }}
      />,
    );
    const textarea = screen.getByRole("textbox", { name: "Message" });

    fireEvent.keyDown(textarea, { key: "Escape" });
    expect(screen.queryByRole("status", { name: TIP_NAME })).toBeNull();
    expect(onCancelReply).not.toHaveBeenCalled();

    fireEvent.keyDown(textarea, { key: "Escape" });
    expect(onCancelReply).toHaveBeenCalledTimes(1);
  });

  it("dismisses on Escape from the close button", () => {
    renderInput();

    fireEvent.keyDown(
      screen.getByRole("button", { name: "Dismiss @Chat tip" }),
      { key: "Escape" },
    );

    expect(screen.queryByRole("status", { name: TIP_NAME })).toBeNull();
  });

  it("leaves Escape to the mention picker while it is open", () => {
    const { textarea } = renderInput();

    fireEvent.change(textarea, { target: { value: "@al", selectionStart: 3 } });
    expect(screen.getByTestId("ai-selection-dialog")).toBeInTheDocument();
    fireEvent.keyDown(textarea, { key: "Escape" });

    expect(screen.getByRole("status", { name: TIP_NAME })).toBeInTheDocument();
  });

  it("counts typing @Chat as seen", () => {
    const { textarea } = renderInput();

    fireEvent.change(textarea, { target: { value: "@Chat what is this?" } });

    expect(screen.queryByRole("status", { name: TIP_NAME })).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.CHAT_TIP_SEEN)).not.toBeNull();
  });

  it("still sends on Enter while the tip is up", () => {
    const { textarea, onSendMessage } = renderInput();

    fireEvent.change(textarea, { target: { value: "hello" } });
    fireEvent.keyPress(textarea, { key: "Enter", code: "Enter", charCode: 13 });

    expect(onSendMessage).toHaveBeenCalledWith("hello");
  });
});
