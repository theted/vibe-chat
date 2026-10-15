import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AIStatusNotice from "./AIStatusNotice";
import type { AIStatus } from "@/types";

const status = (overrides: Partial<AIStatus>): AIStatus => ({
  roomId: "default",
  status: "active",
  remaining: 10,
  maxMessages: 10,
  messageCount: 0,
  ...overrides,
});

describe("AIStatusNotice", () => {
  it("stays out of the way while the models have room to talk", () => {
    const { container } = render(
      <AIStatusNotice
        aiStatus={status({ messageCount: 4, remaining: 6 })}
        isAuthenticated
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("doesn't call a fresh room low on messages", () => {
    const { container } = render(
      <AIStatusNotice
        aiStatus={status({ maxMessages: 2, remaining: 2 })}
        isAuthenticated
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("warns when only a few messages are left", () => {
    render(
      <AIStatusNotice
        aiStatus={status({ messageCount: 9, remaining: 1 })}
        isAuthenticated
      />,
    );
    expect(screen.getByRole("status").textContent).toBe(
      "The models can send 1 more message before they rest.",
    );
  });

  it("explains the rest and how to end it", () => {
    render(
      <AIStatusNotice
        aiStatus={status({
          status: "sleeping",
          reason: "message-limit-reached",
          messageCount: 10,
          remaining: 0,
        })}
        isAuthenticated
      />,
    );
    expect(screen.getByRole("status").textContent).toContain(
      "resting after 10 messages in a row. Say something to wake them.",
    );
  });

  it("tells guests someone else will wake them", () => {
    render(
      <AIStatusNotice
        aiStatus={status({
          status: "sleeping",
          reason: "manual",
          remaining: 0,
        })}
        isAuthenticated={false}
      />,
    );
    expect(screen.getByRole("status").textContent).toContain(
      "paused for now. They’ll be back when someone speaks.",
    );
  });
});
