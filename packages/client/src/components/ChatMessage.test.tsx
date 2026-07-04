import { render, screen } from "@testing-library/react";
import ChatMessage from "./ChatMessage";
import type { Message } from "@/types";

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
      <ChatMessage
        message={message}
        participants={[{ username: "Skylar" }]}
      />,
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
