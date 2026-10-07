/**
 * Transcript grouping - consecutive messages from one sender collapse under a
 * single name/avatar so a model's multi-part answer reads as one block.
 */

import type { Message } from "@/types";

// Beyond this gap a new header helps place the message in time
const GROUP_WINDOW_MS = 5 * 60_000;

export const isContinuation = (
  previous: Message | undefined,
  current: Message,
): boolean =>
  Boolean(
    previous &&
    current.senderType !== "system" &&
    previous.senderType === current.senderType &&
    previous.sender === current.sender &&
    // A reply quote needs its header to say who is answering
    !current.mentionsTriggerMessageId &&
    current.timestamp - previous.timestamp < GROUP_WINDOW_MS,
  );
