import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ParticipantsList from "./ParticipantsList";
import type { ReactNode } from "react";
import type { AiParticipant } from "@/config/aiParticipants";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      ...props
    }: {
      children: ReactNode;
      [key: string]: unknown;
    }) => <div {...props}>{children}</div>,
  },
}));

vi.mock("./SectionHeader", () => ({
  default: ({ title, count }: { title: string; count: number }) => (
    <div data-testid={`section-${title}`}>{`${title} (${count})`}</div>
  ),
}));

vi.mock("./Icon", () => ({
  default: ({ name }: { name: string }) => (
    <span data-testid={`icon-${name}`}>{name}</span>
  ),
}));

const OPENAI_TEST: AiParticipant = {
  id: "OPENAI_TEST",
  name: "Test AI",
  alias: "test-ai",
  provider: "OpenAI",
  status: "active",
  emoji: "✨",
};
const ANTHROPIC_TEST: AiParticipant = {
  id: "ANTHROPIC_TEST",
  name: "Claude Test",
  alias: "claude-test",
  provider: "Anthropic",
  status: "active",
  emoji: "🎸",
};

describe("ParticipantsList", () => {
  it("groups active AI participants by provider and sorts by model name", () => {
    const aiParticipants: AiParticipant[] = [
      {
        id: "OPENAI_BETA",
        name: "Beta",
        alias: "beta",
        provider: "OpenAI",
        status: "active",
        emoji: "🧠",
      },
      {
        id: "ANTHROPIC_DELTA",
        name: "Delta",
        alias: "delta",
        provider: "Anthropic",
        status: "active",
        emoji: "🎵",
      },
      // Parked: must not reach the panel at all
      {
        id: "OPENAI_GAMMA",
        name: "Gamma",
        alias: "gamma",
        provider: "OpenAI",
        status: "inactive",
        emoji: "✨",
      },
      {
        id: "ANTHROPIC_ALPHA",
        name: "Alpha",
        alias: "alpha",
        provider: "Anthropic",
        status: "active",
        emoji: "🍃",
      },
    ];

    const { container } = render(
      <ParticipantsList participants={[]} aiParticipants={aiParticipants} />,
    );

    const providerHeaders = screen.getAllByTestId(/ai-provider-/i);
    expect(providerHeaders.map((header) => header.textContent)).toEqual([
      "Anthropic",
      "OpenAI",
    ]);

    const modelNames = Array.from(
      container.querySelectorAll('[data-testid^="ai-name-"]'),
    ).map((node) => node.textContent);

    expect(modelNames).toEqual(["Alpha", "Delta", "Beta"]);
  });

  it("omits the status badge now that every listed model is active", () => {
    const { container } = render(
      <ParticipantsList
        participants={[]}
        aiParticipants={[
          {
            id: "OPENAI_BETA",
            name: "Beta",
            alias: "beta",
            provider: "OpenAI",
            status: "active",
            emoji: "🧠",
          },
        ]}
      />,
    );

    expect(container.textContent).not.toContain("active");
  });

  it("calls onAISelect when clicking an AI name", () => {
    const onAISelect = vi.fn();

    render(
      <ParticipantsList
        participants={[]}
        aiParticipants={[OPENAI_TEST]}
        onAISelect={onAISelect}
      />,
    );

    fireEvent.click(screen.getByTestId("ai-name-OPENAI_TEST"));

    expect(onAISelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "OPENAI_TEST" }),
    );
  });

  it("lists every model from the start, with no recent speakers above them", () => {
    render(
      <ParticipantsList
        participants={[]}
        aiParticipants={[OPENAI_TEST, ANTHROPIC_TEST]}
      />,
    );

    expect(screen.getByTestId("ai-name-OPENAI_TEST")).toBeInTheDocument();
    expect(screen.getByTestId("ai-name-ANTHROPIC_TEST")).toBeInTheDocument();
    expect(screen.queryByTestId("section-Talking")).toBeNull();

    const toggle = screen.getByRole("button", { name: /all models/i });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(toggle);
    expect(screen.queryByTestId("ai-name-OPENAI_TEST")).toBeNull();
  });

  it("finds models in the full list by name or lab", () => {
    render(
      <ParticipantsList
        participants={[]}
        aiParticipants={[OPENAI_TEST, ANTHROPIC_TEST]}
      />,
    );

    const search = screen.getByRole("searchbox", { name: /find a model/i });
    fireEvent.change(search, { target: { value: "anthro" } });
    expect(screen.queryByTestId("ai-name-OPENAI_TEST")).toBeNull();
    expect(screen.getByTestId("ai-name-ANTHROPIC_TEST")).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "test ai" } });
    expect(screen.getByTestId("ai-name-OPENAI_TEST")).toBeInTheDocument();
    expect(screen.queryByTestId("ai-name-ANTHROPIC_TEST")).toBeNull();
  });

  it("highlights a private group's members and offers to add the rest", () => {
    render(
      <ParticipantsList
        participants={[]}
        aiParticipants={[OPENAI_TEST, ANTHROPIC_TEST]}
        onAISelect={vi.fn()}
        privateRoster={{ memberIds: ["ANTHROPIC_TEST"], isFull: false }}
      />,
    );

    const member = screen
      .getByTestId("ai-name-ANTHROPIC_TEST")
      .closest("button");
    const outsider = screen
      .getByTestId("ai-name-OPENAI_TEST")
      .closest("button");
    expect(member).toHaveAttribute("aria-current", "true");
    expect(outsider).toHaveAttribute("title", "Add Test AI to this chat");
    expect(outsider).not.toHaveAttribute("aria-current");
  });

  it("stops offering models once a private chat is full", () => {
    const onAISelect = vi.fn();
    render(
      <ParticipantsList
        participants={[]}
        aiParticipants={[OPENAI_TEST, ANTHROPIC_TEST]}
        onAISelect={onAISelect}
        privateRoster={{ memberIds: ["ANTHROPIC_TEST"], isFull: true }}
      />,
    );

    expect(
      screen.getByTestId("ai-name-OPENAI_TEST").closest("button"),
    ).toBeNull();
    fireEvent.click(screen.getByTestId("ai-name-OPENAI_TEST"));
    expect(onAISelect).not.toHaveBeenCalled();
  });

  it("marks a model that's writing in the list", () => {
    render(
      <ParticipantsList
        participants={[]}
        aiParticipants={[OPENAI_TEST, ANTHROPIC_TEST]}
        typingAIs={[
          {
            id: "OPENAI_TEST",
            name: "Test AI",
            displayName: "Test AI",
            alias: "test-ai",
            normalizedAlias: "testai",
            type: "ai",
          },
        ]}
      />,
    );

    expect(
      screen.getByRole("status", { name: "Test AI is typing" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: "Claude Test is typing" }),
    ).toBeNull();
  });
});
