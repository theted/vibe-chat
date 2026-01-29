import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "./Dashboard";
import type { AiParticipant } from '../config/aiParticipants';

const { mockHandlers, mockEmit } = vi.hoisted(() => ({
  mockHandlers: {} as Record<string, (data: unknown) => void>,
  mockEmit: vi.fn(),
}));

vi.mock("../hooks/useSocket", () => ({
  useSocket: () => ({
    on: (event: string, callback: (data: unknown) => void) => {
      mockHandlers[event] = callback;
    },
    emit: mockEmit,
  }),
}));

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockHandlers)) {
      delete mockHandlers[key];
    }
  });

  it("renders enabled AI participants from socket updates", () => {
    render(
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    );

    expect(mockHandlers["ai-participants"]).toBeTypeOf("function");

    act(() => {
      mockHandlers["ai-participants"]([
        {
          id: "alpha",
          name: "Alpha",
          alias: "alpha",
          provider: "OpenAI",
          status: "active",
          emoji: "🅰️",
        },
        {
          id: "beta",
          name: "Beta",
          alias: "beta",
          provider: "Anthropic",
          status: "inactive",
          emoji: "🅱️",
        },
      ]);
    });

    expect(screen.getByText("Enabled AI Participants")).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.queryByText("Beta")).not.toBeInTheDocument();
    expect(screen.getByText("@alpha")).toBeInTheDocument();
  });
});
