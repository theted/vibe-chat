/**
 * Composer + real mention dialog together: the dialog's capture-phase Enter
 * must insert the mention without also firing the composer's Enter-to-send.
 * MessageInput.test.tsx mocks the dialog, so this lives in its own file.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import type { ReactNode } from "react";
import MessageInput from "./MessageInput";

vi.mock("framer-motion", () => {
  const MOTION_ONLY_PROPS = new Set([
    "initial",
    "animate",
    "exit",
    "transition",
    "variants",
    "whileHover",
    "whileTap",
    "layout",
    "layoutId",
  ]);
  const domProps = (props: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(props).filter(([key]) => !MOTION_ONLY_PROPS.has(key)),
    );
  return {
    motion: new Proxy(
      {},
      {
        get:
          (_target, tag: string) =>
          ({ children, ...props }: { children?: ReactNode }) =>
            createElement(tag, domProps(props), children),
      },
    ),
    AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  };
});

// vi.mock is hoisted above this file's consts, so the fixtures must be too
const { mockParticipants } = vi.hoisted(() => ({
  mockParticipants: [
    {
      id: "ALPHA",
      name: "Alpha",
      alias: "alpha",
      provider: "Test",
      status: "active",
      emoji: "🅰️",
    },
    {
      id: "BETA",
      name: "Beta",
      alias: "beta",
      provider: "Test",
      status: "active",
      emoji: "🅱️",
    },
  ],
}));

vi.mock("@/config/aiParticipants", () => ({
  DEFAULT_AI_PARTICIPANTS: mockParticipants,
  getActiveParticipants: () => mockParticipants,
}));

describe("MessageInput @mention picking", () => {
  const onSendMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = () => {
    render(
      <MessageInput
        onSendMessage={onSendMessage}
        onTypingStart={vi.fn()}
        onTypingStop={vi.fn()}
        disabled={false}
      />,
    );
    return screen.getByPlaceholderText<HTMLTextAreaElement>(/@ to mention/i);
  };

  it("inserts the highlighted mention with one Enter and does not send", async () => {
    const user = userEvent.setup();
    const textarea = setup();

    // "a" matches several options (@Chat too); ArrowDown moves past the top
    // hit, so find Beta's position instead of assuming it
    await user.type(textarea, "hi @a");
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveTextContent("@alpha");
    const betaIndex = options.findIndex((option) =>
      option.textContent?.includes("@beta"),
    );
    expect(betaIndex).toBeGreaterThan(0);
    await user.keyboard(`${"{ArrowDown}".repeat(betaIndex)}{Enter}`);

    expect(textarea.value).toBe("hi @beta ");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onSendMessage).not.toHaveBeenCalled();

    // With the dialog closed, Enter sends again
    await user.keyboard("{Enter}");
    expect(onSendMessage).toHaveBeenCalledWith("hi @beta");
  });

  it("inserts the mention on Tab", async () => {
    const user = userEvent.setup();
    const textarea = setup();

    await user.type(textarea, "@al");
    await user.keyboard("{Tab}");

    expect(textarea.value).toBe("@alpha ");
    expect(onSendMessage).not.toHaveBeenCalled();
  });
});
