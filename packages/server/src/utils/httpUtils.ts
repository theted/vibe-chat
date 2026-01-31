/**
 * HTTP-related utility functions
 */

import type { IncomingHttpHeaders } from "http";
import type { Socket } from "socket.io";

/**
 * Extract client IP address from socket connection headers
 * Checks common proxy headers first, then falls back to direct connection
 */
export const getClientIp = (socket: Socket): string | null => {
  const headers = (socket.handshake?.headers || {}) as IncomingHttpHeaders;

  const forwarded = headers["x-forwarded-for"];
  if (forwarded) {
    const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const forwardedIps = forwardedValue
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (forwardedIps.length > 0) {
      return forwardedIps[0];
    }
  }

  const realIpHeader = headers["x-real-ip"] || headers["cf-connecting-ip"];
  if (realIpHeader) {
    const realIp = Array.isArray(realIpHeader) ? realIpHeader[0] : realIpHeader;
    return realIp;
  }

  return (
    socket.handshake?.address ||
    socket.conn?.remoteAddress ||
    socket.request?.connection?.remoteAddress ||
    null
  );
};
