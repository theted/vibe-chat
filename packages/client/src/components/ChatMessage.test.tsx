import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ChatMessage from "./ChatMessage";
import type { Message } from "@/types";

const makeMessage = (overrides: Partial<Message>): Message => ({
  id: "link-message",
  senderType: "user",
  sender: "Skylar",
  content: "",
  timestamp: Date.now(),
  ...overrides,
});

describe("ChatMessage links", () => {
  it.each([
    ["human", makeMessage({ senderType: "user", sender: "Skylar" })],
    ["AI", makeMessage({ senderType: "ai", sender: "Claude Opus 5.5" })],
    ["@Chat", makeMessage({ senderType: "ai", sender: "@Chat" })],
  ])("links a bare URL in a %s message", (_label, message) => {
    render(
      <ChatMessage
        message={{ ...message, content: "Docs at https://example.com/docs ok" }}
      />,
    );

    const link = screen.getByRole("link", {
      name: "https://example.com/docs",
    });
    expect(link).toHaveAttribute("href", "https://example.com/docs");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveClass("markdown-link");
  });

  it("renders markdown links in human messages", () => {
    render(
      <ChatMessage
        message={makeMessage({
          content: "See [the repo](https://github.com/theted/vibe-chat)",
        })}
      />,
    );

    expect(screen.getByRole("link", { name: "the repo" })).toHaveAttribute(
      "href",
      "https://github.com/theted/vibe-chat",
    );
  });

  it("keeps mention chips next to links in human messages", () => {
    render(
      <ChatMessage
        message={makeMessage({
          content: "@Claude Haiku 4.5 look at https://example.com",
        })}
      />,
    );

    expect(screen.getByText("@Claude Haiku 4.5")).toHaveClass("mention-chip");
    expect(
      screen.getByRole("link", { name: "https://example.com" }),
    ).toBeInTheDocument();
  });

  it("leaves an @ inside a URL as part of the link", () => {
    render(
      <ChatMessage
        message={makeMessage({
          content: "Read https://medium.com/@Claude Haiku 4.5",
        })}
      />,
    );

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "https://medium.com/@Claude",
    );
  });

  it("keeps line breaks people type", () => {
    const { container } = render(
      <ChatMessage message={makeMessage({ content: "first line\nsecond" })} />,
    );

    expect(container.querySelector("br")).toBeInTheDocument();
  });

  it("shows raw HTML in a human message as text, never as markup", () => {
    const { container } = render(
      <ChatMessage
        message={makeMessage({ content: "<img src=x onerror=alert(1)>" })}
      />,
    );

    expect(container.querySelector("img")).not.toBeInTheDocument();
  });
});

describe("ChatMessage", () => {
  it("highlights @mentions with spaces without brackets", () => {
    const message: Message = {
      id: "test-message-2",
      senderType: "user",
      sender: "User",
      content: "Hello @Claude Haiku 4.5 how are you?",
      timestamp: Date.now(),
    };

    render(<ChatMessage message={message} />);

    const mention = screen.getByText("@Claude Haiku 4.5");
    expect(mention).toHaveClass("mention-chip");
  });

  it("highlights user mentions in AI messages", () => {
    const message: Message = {
      id: "test-message-3",
      senderType: "ai",
      sender: "AI",
      content: "Thanks for the update, @Skylar.",
      timestamp: Date.now(),
    };

    render(
      <ChatMessage message={message} participants={[{ username: "Skylar" }]} />,
    );

    const mention = screen.getByText("@Skylar");
    expect(mention).toHaveClass("mention-chip");
  });

  it("renders a reply quote with the quoted message excerpt", () => {
    const quotedMessage: Message = {
      id: "trigger-1",
      senderType: "user",
      sender: "Skylar",
      content: "What do you all think about log-normal delays?",
      timestamp: Date.now(),
    };
    const message: Message = {
      id: "reply-1",
      senderType: "ai",
      sender: "Claude Opus 4.8",
      content: "Great fit for conversational pacing.",
      timestamp: Date.now(),
      mentionsTriggerMessageId: "trigger-1",
      mentionsTriggerSender: "Skylar",
    };

    render(<ChatMessage message={message} quotedMessage={quotedMessage} />);

    expect(screen.getByText("↩ Skylar")).toBeInTheDocument();
    expect(
      screen.getByText("What do you all think about log-normal delays?"),
    ).toBeInTheDocument();
  });

  it("falls back to sender-only quote when the quoted message is gone", () => {
    const message: Message = {
      id: "reply-2",
      senderType: "ai",
      sender: "Claude Opus 4.8",
      content: "Following up on that earlier point.",
      timestamp: Date.now(),
      mentionsTriggerMessageId: "scrolled-out",
      mentionsTriggerSender: "Skylar",
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText("↩ Skylar")).toBeInTheDocument();
  });

  it("renders no quote for ordinary messages", () => {
    const message: Message = {
      id: "plain-1",
      senderType: "ai",
      sender: "AI",
      content: "Just a regular message.",
      timestamp: Date.now(),
    };

    render(<ChatMessage message={message} />);

    expect(screen.queryByText(/↩/)).not.toBeInTheDocument();
  });
});
