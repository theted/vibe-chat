import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

vi.mock("./AnimatedListItem", () => ({
  default: ({
    children,
    ...props
  }: {
    children: ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
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

describe("ParticipantsList", () => {
  it("groups AI participants by provider and sorts by model name", () => {
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
      "Anthropic (2)",
      "OpenAI (2)",
    ]);

    const modelNames = Array.from(
      container.querySelectorAll('[data-testid^="ai-name-"]'),
    ).map((node) => node.textContent);

    expect(modelNames).toEqual(["Alpha", "Delta", "Beta", "Gamma"]);
  });
});
