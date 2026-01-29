import { render, screen } from "@testing-library/react";
import ChatMessage from "./ChatMessage.jsx";

describe("ChatMessage", () => {
  it("highlights bracketed @mentions with spaces as a single chip", () => {
    const message = {
      senderType: "user",
      sender: "User",
      content: "Hello @[Grok Code Fast 1] how are you?",
      timestamp: Date.now(),
    };

    render(<ChatMessage message={message} />);

    const mention = screen.getByText("@[Grok Code Fast 1]");
    expect(mention).toHaveClass("mention-chip");
  });
});
