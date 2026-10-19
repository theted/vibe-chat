/** DOM id of a transcript row, so a reply's quote can scroll to it. */
export const messageElementId = (messageId: string): string =>
  `message-${messageId}`;
