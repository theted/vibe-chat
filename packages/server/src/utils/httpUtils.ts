/**
 * HTTP-related utility functions
 */

import type { IncomingHttpHeaders } from "http";
import type { Socket } from "socket.io";

const IPV4_MAPPED_PREFIX = "::ffff:";

/**
 * Loopback, private, link-local or unspecified - addresses our own proxies
 * (host nginx, the Docker network) have, and an internet client never does.
 */
export const isPrivateAddress = (address: string): boolean => {
  const ip = address.trim().toLowerCase().replace(IPV4_MAPPED_PREFIX, "");
  const octets = ip.split(".").map(Number);
  if (octets.length === 4 && octets.every((octet) => Number.isInteger(octet))) {
    const [a, b] = octets;
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    );
  }
  return (
    ip === "::1" ||
    ip === "::" ||
    /^f[cd][0-9a-f]{0,2}:/.test(ip) ||
    /^fe[89ab][0-9a-f]?:/.test(ip)
  );
};

const firstHeaderValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * Extract the client IP address from socket connection headers.
 *
 * X-Forwarded-For is a list each proxy appends to, and its leftmost entries
 * are whatever the client chose to send - trusting the first entry let anyone
 * dodge the rate limiter with a made-up header. Production runs behind host
 * nginx and a Docker nginx, both on private addresses, so the client is the
 * rightmost public entry. X-Real-IP is no help there: the inner proxy
 * overwrites it with the outer proxy's private address.
 */
export const getClientIp = (socket: Socket): string | null => {
  const headers = (socket.handshake?.headers || {}) as IncomingHttpHeaders;

  const forwardedIps = (firstHeaderValue(headers["x-forwarded-for"]) ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const clientIp = [...forwardedIps]
    .reverse()
    .find((ip) => !isPrivateAddress(ip));
  if (clientIp) return clientIp;

  const realIp = firstHeaderValue(
    headers["x-real-ip"] || headers["cf-connecting-ip"],
  );
  if (realIp && !isPrivateAddress(realIp)) return realIp;

  // All-private chains only happen on a local network: fall back to the
  // address closest to the client
  return (
    forwardedIps[0] ||
    realIp ||
    socket.handshake?.address ||
    socket.conn?.remoteAddress ||
    socket.request?.connection?.remoteAddress ||
    null
  );
};
