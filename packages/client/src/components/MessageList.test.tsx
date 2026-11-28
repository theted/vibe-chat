import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import MessageList from "./MessageList";
import type { Message } from "@/types";

const makeMessage = (overrides: Partial<Message>): Message => ({
  id: `message-${overrides.content}`,
  senderType: "user",
  sender: "Skylar",
  content: "",
  timestamp: 1,
  ...overrides,
});

const renderList = (messages: Message[]) =>
  render(
    <MessageList
      messages={messages}
      messagesById={new Map()}
      aiParticipants={[]}
      participants={[{ username: "Skylar" }]}
    />,
  );

describe("MessageList mentions", () => {
  it("chips a person in the room, in people's and AIs' messages", () => {
    renderList([
      makeMessage({ sender: "Theted", content: "hey @skylar" }),
      makeMessage({
        senderType: "ai",
        sender: "Claude Opus 5.5",
        content: "Good point, @Skylar - agreed",
      }),
    ]);

    expect(screen.getByText("@skylar")).toHaveClass("mention-chip");
    expect(screen.getByText("@Skylar")).toHaveClass("mention-chip");
  });

  it("chips someone who wrote in the transcript but isn't in the room now", () => {
    renderList([
      makeMessage({ sender: "Theted", content: "back in a bit" }),
      makeMessage({
        senderType: "ai",
        sender: "Claude Opus 5.5",
        content: "**@Theted**, which one should we file?",
      }),
    ]);

    expect(screen.getByText("@Theted")).toHaveClass("mention-chip");
  });

  it("leaves names the client has never seen as text", () => {
    renderList([makeMessage({ content: "ask @someone" })]);

    expect(screen.getByText("ask @someone")).not.toHaveClass("mention-chip");
  });

  it("chips @Chat in its own colour", () => {
    renderList([makeMessage({ content: "@chat what changed?" })]);

    expect(screen.getByText("@chat")).toHaveClass(
      "mention-chip",
      "mention-chip-voice",
    );
  });
});
