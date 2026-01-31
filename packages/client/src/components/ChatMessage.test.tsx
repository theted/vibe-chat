import { render, screen } from "@testing-library/react";
import ChatMessage from "./ChatMessage";
import type { Message } from "@/types";

describe("ChatMessage", () => {
  it("highlights @mentions with spaces without brackets", () => {
    const message: Message = {
      id: "test-message-2",
      senderType: "user",
      sender: "User",
      content: "Hello @Claude 3.5 Haiku how are you?",
      timestamp: Date.now(),
    };

    render(<ChatMessage message={message} />);

    const mention = screen.getByText("@Claude 3.5 Haiku");
    expect(mention).toHaveClass("mention-chip");
  });
});
