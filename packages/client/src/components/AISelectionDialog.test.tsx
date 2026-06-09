import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import AISelectionDialog from "./AISelectionDialog";
import { createElement } from "react";
import type { ReactNode } from "react";

const stripMotionProps = (props: Record<string, unknown>) => {
  const {
    whileHover,
    whileTap,
    initial,
    animate,
    exit,
    variants,
    transition,
    layout,
    layoutId,
    ...rest
  } = props;
  return rest;
};

// Proxy covers every motion.* element so new tags in the component don't break the mock
vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag: string) =>
        ({
          children,
          ...props
        }: {
          children?: ReactNode;
          [key: string]: unknown;
        }) =>
          createElement(tag, stripMotionProps(props), children),
    },
  ),
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
      "aria-selected",
      "true",
    );

    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[1]).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // Two-step flow: first Enter opens the detail view, second Enter inserts
    fireEvent.keyDown(document, { key: "Enter" });
    fireEvent.keyDown(document, { key: "Enter" });
    expect(defaultProps.onSelect).toHaveBeenCalledWith("beta");
  });

  it("wraps selection when navigating above the first option", () => {
    render(<AISelectionDialog {...defaultProps} />);

    fireEvent.keyDown(document, { key: "ArrowUp" });
    const options = screen.getAllByRole("option");
    const lastOption = options[options.length - 1];

    expect(lastOption).toHaveAttribute("aria-selected", "true");
  });
});
