import { describe, expect, test } from "bun:test";

import {
  isBlockedAddress,
  pinToAddress,
  resolvePublicTarget,
  UnsafeUrlError,
} from "./urlSafety";

describe("isBlockedAddress", () => {
  test.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.18.0.2", // Docker bridge network
    "192.168.1.10",
    "169.254.169.254", // EC2 instance metadata
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "fd12:3456::1",
    "fe80::1",
    "::ffff:10.0.0.1",
    "::ffff:a00:1", // same address, the way new URL() spells it
    "::ffff:a9fe:a9fe", // 169.254.169.254
  ])("blocks %s", (ip) => {
    expect(isBlockedAddress(ip)).toBe(true);
  });

  test.each([
    "93.184.215.14",
    "1.1.1.1",
    "172.32.0.1",
    "2606:4700::1111",
    "::ffff:5db8:d70e", // 93.184.215.14, IPv4-mapped
  ])("allows public %s", (ip) => {
    expect(isBlockedAddress(ip)).toBe(false);
  });
});

describe("resolvePublicTarget", () => {
  test.each([
    "file:///etc/passwd",
    "ftp://example.com/file",
    "http://localhost:3001/health",
    "http://foo.localhost/",
    "http://127.0.0.1:6379/",
    "http://[::1]/",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::ffff:10.0.0.1]/",
    "not a url",
  ])("rejects %s", async (url) => {
    await expect(resolvePublicTarget(url)).rejects.toBeInstanceOf(
      UnsafeUrlError,
    );
  });

  test("accepts a public IP literal without a DNS lookup", async () => {
    const { url, address } = await resolvePublicTarget(
      "http://93.184.215.14/page",
    );
    expect(url.hostname).toBe("93.184.215.14");
    expect(address).toBe("93.184.215.14");
  });
});

describe("pinToAddress", () => {
  test("connects to the checked IP but keeps the host for Host and TLS", () => {
    const pinned = pinToAddress({
      url: new URL("https://docs.example.com:8443/guide?q=1"),
      address: "93.184.215.14",
    });
    expect(pinned).toEqual({
      url: "https://93.184.215.14:8443/guide?q=1",
      headers: { Host: "docs.example.com:8443" },
      tls: { serverName: "docs.example.com" },
    });
  });

  test("brackets IPv6 addresses", () => {
    const pinned = pinToAddress({
      url: new URL("http://example.com/"),
      address: "2606:2800:21f:cb07:6820:80da:af6b:8b2c",
    });
    expect(pinned.url).toBe("http://[2606:2800:21f:cb07:6820:80da:af6b:8b2c]/");
    expect(pinned.tls).toBeUndefined();
  });

  test("sends no TLS server name for an IP literal", () => {
    const pinned = pinToAddress({
      url: new URL("https://93.184.215.14/"),
      address: "93.184.215.14",
    });
    expect(pinned.tls).toBeUndefined();
  });
});
