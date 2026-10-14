import { describe, expect, it } from "bun:test";
import type { Socket } from "socket.io";

import { getClientIp, isPrivateAddress } from "./httpUtils.js";

const socketWith = (
  headers: Record<string, string>,
  address = "172.18.0.5",
): Socket => ({ handshake: { headers, address } }) as unknown as Socket;

describe("getClientIp", () => {
  it("takes the client from behind both production proxies", () => {
    // Host nginx appends the client, Docker nginx appends host nginx
    const socket = socketWith({
      "x-forwarded-for": "203.0.113.7, 172.18.0.1",
      "x-real-ip": "172.18.0.1",
    });
    expect(getClientIp(socket)).toBe("203.0.113.7");
  });

  it("ignores addresses the client made up", () => {
    const socket = socketWith({
      "x-forwarded-for": "6.6.6.6, 10.0.0.1, 203.0.113.7, 172.18.0.1",
    });
    expect(getClientIp(socket)).toBe("203.0.113.7");
  });

  it("falls back to the socket address without proxy headers", () => {
    expect(getClientIp(socketWith({}, "::1"))).toBe("::1");
  });

  it("keeps the old behaviour on an all-private network", () => {
    const socket = socketWith({ "x-forwarded-for": "192.168.1.20, 172.18.0.1" });
    expect(getClientIp(socket)).toBe("192.168.1.20");
  });
});

describe("isPrivateAddress", () => {
  it.each([
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.0.1",
    "127.0.0.1",
    "::1",
    "::ffff:172.18.0.1",
    "fd00::1",
    "fe80::1",
  ])("treats %p as private", (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it.each(["203.0.113.7", "172.32.0.1", "8.8.8.8", "2001:db8::1"])(
    "treats %p as public",
    (address) => {
      expect(isPrivateAddress(address)).toBe(false);
    },
  );
});
