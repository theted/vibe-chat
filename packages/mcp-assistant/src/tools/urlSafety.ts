/**
 * SSRF guard for the browse tool. The server shares a Docker network with
 * Redis and Chroma and runs on EC2, so a model-chosen URL must never reach
 * private, loopback or link-local addresses (169.254.169.254 = instance
 * metadata). The checked address is also the one fetched (pinToAddress), so
 * DNS can't hand fetch() a different, private address after the check.
 */

import { lookup } from "dns/promises";
import { isIP } from "net";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);

// [network, prefix length] pairs
const BLOCKED_IPV4_RANGES: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // link-local, incl. cloud metadata
  ["172.16.0.0", 12], // includes Docker bridge networks
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved + broadcast
];

const ipv4ToInt = (ip: string): number =>
  ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;

const isBlockedIpv4 = (ip: string): boolean => {
  const value = ipv4ToInt(ip);
  return BLOCKED_IPV4_RANGES.some(([network, prefix]) => {
    const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    return (value & mask) === (ipv4ToInt(network) & mask);
  });
};

const HEXTET = 0x10000;

/** The embedded IPv4 of an IPv4-mapped address, in either spelling. */
const mappedIpv4 = (ip: string): string | null => {
  const dotted = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (dotted) return dotted[1];
  // new URL() rewrites [::ffff:10.0.0.1] as [::ffff:a00:1]
  const hex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!hex) return null;
  const value = parseInt(hex[1], 16) * HEXTET + parseInt(hex[2], 16);
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 0xff).join(".");
};

const isBlockedIpv6 = (ip: string): boolean => {
  const normalized = ip.toLowerCase();
  // IPv4-mapped (::ffff:10.0.0.1) - judge by the embedded IPv4 address
  const mapped = mappedIpv4(normalized);
  if (mapped) return isBlockedIpv4(mapped);

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") || // unique local fc00::/7
    normalized.startsWith("fd") ||
    /^fe[89ab]/.test(normalized) || // link-local fe80::/10
    normalized.startsWith("ff") // multicast
  );
};

export const isBlockedAddress = (ip: string): boolean =>
  isIP(ip) === 6 ? isBlockedIpv6(ip) : isBlockedIpv4(ip);

export class UnsafeUrlError extends Error {}

export type PublicTarget = {
  url: URL;
  /** Checked address to connect to, instead of letting fetch() resolve again */
  address: string;
};

const stripBrackets = (hostname: string): string =>
  hostname.replace(/^\[|\]$/g, "");

/** Throws UnsafeUrlError unless every address the host resolves to is public. */
export const resolvePublicTarget = async (
  rawUrl: string,
): Promise<PublicTarget> => {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError(`Not a valid absolute URL: ${rawUrl}`);
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new UnsafeUrlError(`Only http and https URLs can be browsed.`);
  }

  // URL keeps IPv6 literals bracketed: [::1]
  const hostname = stripBrackets(url.hostname).toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost")) {
    throw new UnsafeUrlError(`Refusing to browse internal host ${hostname}.`);
  }

  const addresses = isIP(hostname)
    ? [hostname]
    : (await lookup(hostname, { all: true })).map(({ address }) => address);

  if (addresses.length === 0 || addresses.some(isBlockedAddress)) {
    throw new UnsafeUrlError(
      `Refusing to browse ${hostname}: it resolves to a private or internal address.`,
    );
  }

  return { url, address: addresses[0] };
};

/**
 * A request that connects to the checked address but still speaks to the
 * original site: the URL carries the IP, Host names the site, and TLS keeps
 * the hostname for SNI and certificate verification. Without the pin, a
 * rebinding DNS server could answer the check with a public address and
 * fetch()'s own lookup with a private one.
 */
export const pinToAddress = ({ url, address }: PublicTarget) => {
  const pinned = new URL(url);
  pinned.hostname = isIP(address) === 6 ? `[${address}]` : address;
  const hostname = stripBrackets(url.hostname);
  const hasServerName = url.protocol === "https:" && !isIP(hostname);
  return {
    url: pinned.href,
    headers: { Host: url.host },
    // Bun's fetch() extension, verified to check the certificate against
    // serverName. Elsewhere it's ignored and the IP fails verification, so
    // HTTPS fails closed rather than unpinned.
    tls: hasServerName ? { serverName: hostname } : undefined,
  };
};
