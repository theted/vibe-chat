import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import AISelectionDialog from "./AISelectionDialog";
import type { ReactNode } from "react";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: {
      children: ReactNode;
      [key: string]: unknown;
    }) => <div {...props}>{children}</div>,
    button: ({
      children,
      ...props
    }: {
      children: ReactNode;
      [key: string]: unknown;
    }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("./Icon", () => ({
  default: ({ name }: { name: string }) => (
    <span data-testid={`icon-${name}`}>{name}</span>
  ),
}));

vi.mock("@/config/aiParticipants", () => ({
  DEFAULT_AI_PARTICIPANTS: [
    {
      id: "ALPHA",
      name: "Alpha",
      alias: "alpha",
      provider: "Test",
      emoji: "🅰️",
    },
    { id: "BETA", name: "Beta", alias: "beta", provider: "Test", emoji: "🅱️" },
    {
      id: "GAMMA",
      name: "Gamma",
      alias: "gamma",
      provider: "Test",
      emoji: "🌀",
    },
  ],
}));

describe("AISelectionDialog", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelect: vi.fn(),
    searchTerm: "",
    position: { x: 0, y: 0 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("navigates options with arrow keys and selects the active item", () => {
    render(<AISelectionDialog {...defaultProps} />);

    expect(screen.getAllByRole("option")[0]).toHaveAttribute(
      "data-active",
      "true",
    );

    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1]).toHaveAttribute(
      "data-active",
      "true",
    );

    fireEvent.keyDown(document, { key: "Enter" });
    expect(defaultProps.onSelect).toHaveBeenCalledWith("beta");
  });

  it("wraps selection when navigating above the first option", () => {
    render(<AISelectionDialog {...defaultProps} />);

    fireEvent.keyDown(document, { key: "ArrowUp" });
    const options = screen.getAllByRole("option");
    const lastOption = options[options.length - 1];

    expect(lastOption).toHaveAttribute("data-active", "true");
  });
});
