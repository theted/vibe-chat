/**
 * Shared error handling for socket controllers. All handler catch blocks go
 * through these so logging format stays consistent and there is one place to
 * extend (error codes, structured logging, metrics).
 */

import type { Socket } from "socket.io";
import { SOCKET_EVENTS } from "@ai-chat/ai-configs";

export const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Log an unexpected handler error (no client reply). */
export const logSocketError = (context: string, error: unknown): void => {
  console.error(`Error ${context}:`, error);
};

/** Log a non-fatal problem (message only, no stack noise). */
export const warnSocketError = (context: string, error: unknown): void => {
  console.warn(`${context}:`, describeError(error));
};

/** Log the error and reply to the client with a user-facing message. */
export const replySocketError = (
  socket: Socket,
  context: string,
  error: unknown,
  userMessage: string,
): void => {
  logSocketError(context, error);
  socket.emit(SOCKET_EVENTS.ERROR, { message: userMessage });
};
