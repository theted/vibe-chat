export const enhanceContextForTopicChange = (context) => {
  const enhancedContext = [...context];
  enhancedContext.push({
    sender: "System",
    content:
      "Feel free to introduce a new interesting topic or shift the conversation in a different direction.",
    senderType: "system",
    role: "system",
    isInternal: true,
  });
  return enhancedContext;
};

export const enhanceContextForComment = (context, lastMessage) => {
  const enhancedContext = [...context];
  enhancedContext.push({
    sender: "System",
    content: `Consider commenting on or building upon ${lastMessage.sender}'s message: "${lastMessage.content}"`,
    senderType: "system",
    role: "system",
    isInternal: true,
  });
  return enhancedContext;
};
