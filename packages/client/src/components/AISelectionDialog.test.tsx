import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import AISelectionDialog from "./AISelectionDialog";
import { createElement } from "react";
import type { ReactNode } from "react";

const stripMotionProps = (props: Record<string, unknown>) => {
  const {
    whileHover: _whileHover,
    whileTap: _whileTap,
    initial: _initial,
    animate: _animate,
    exit: _exit,
    variants: _variants,
    transition: _transition,
    layout: _layout,
    layoutId: _layoutId,
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
    {
      id: "GAMMA",
      name: "Gamma",
      alias: "gamma",
      provider: "Test",
      status: "active",
      emoji: "🌀",
    },
    // Parked: must never be offered as a mention target
    {
      id: "DELTA",
      name: "Delta",
      alias: "delta",
      provider: "Test",
      status: "inactive",
      emoji: "🔻",
    },
  ],
}));

vi.mock("@/config/aiParticipants", () => ({
  DEFAULT_AI_PARTICIPANTS: mockParticipants,
  getActiveParticipants: () =>
    mockParticipants.filter((ai) => ai.status === "active"),
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
    expect(defaultProps.onSelect).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Enter" });
    expect(defaultProps.onSelect).toHaveBeenCalledWith("beta");
    expect(defaultProps.onSelect).toHaveBeenCalledTimes(1);
  });

  it("never offers a parked model as a mention target", () => {
    render(<AISelectionDialog {...defaultProps} searchTerm="delta" />);

    expect(screen.queryByText("@delta")).toBeNull();
  });

  it("closes when a multi-word term stops matching anything", async () => {
    const onClose = vi.fn();
    render(
      <AISelectionDialog
        {...defaultProps}
        onClose={onClose}
        searchTerm="alpha beta"
      />,
    );

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("opens upward from the input without relying on a CSS transform", () => {
    // framer-motion owns `transform` for the open animation and resets it to
    // none, so anchoring the dialog with translateY(-100%) silently dropped it
    // off the bottom of the viewport.
    const inputTop = 600;
    render(
      <AISelectionDialog {...defaultProps} position={{ x: 40, y: inputTop }} />,
    );

    const dialog = document.querySelector<HTMLElement>(".fixed.z-\\[9999\\]");
    expect(dialog).not.toBeNull();
    expect(dialog!.style.transform).toBe("");
    expect(dialog!.style.bottom).toBe(
      `${window.innerHeight - inputTop + 10}px`,
    );
  });

  it("keeps the dialog inside the viewport when the input is near the edge", () => {
    render(
      <AISelectionDialog
        {...defaultProps}
        position={{ x: window.innerWidth - 5, y: 400 }}
      />,
    );

    const dialog = document.querySelector<HTMLElement>(".fixed.z-\\[9999\\]");
    const left = Number.parseInt(dialog!.style.left, 10);
    expect(left + 320).toBeLessThanOrEqual(window.innerWidth);
  });

  it("wraps selection when navigating above the first option", () => {
    render(<AISelectionDialog {...defaultProps} />);

    fireEvent.keyDown(document, { key: "ArrowUp" });
    const options = screen.getAllByRole("option");
    const lastOption = options[options.length - 1];

    expect(lastOption).toHaveAttribute("aria-selected", "true");
  });
});
