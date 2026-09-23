import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

/**
 * Node ships an experimental `localStorage` global that is inert unless the
 * process gets --localstorage-file. It shadows the one jsdom would provide, so
 * `window.localStorage` comes back undefined and every test touching storage
 * blows up on `.getItem of undefined` rather than exercising the real code.
 *
 * Install a minimal in-memory Storage when that happens. `Storage` is replaced
 * alongside it so tests can still spy on `Storage.prototype.setItem`.
 */
class MemoryStorage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  getItem(key: string): string | null {
    return this.data.get(String(key)) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(String(key), String(value));
  }

  removeItem(key: string): void {
    this.data.delete(String(key));
  }

  clear(): void {
    this.data.clear();
  }
}

const installMemoryStorage = (name: "localStorage" | "sessionStorage") => {
  const existing = Reflect.get(window, name) as Storage | undefined;
  if (typeof existing?.getItem === "function") return;

  Object.defineProperty(window, name, {
    configurable: true,
    writable: true,
    value: new MemoryStorage(),
  });
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value: Reflect.get(window, name),
  });
  Object.defineProperty(globalThis, "Storage", {
    configurable: true,
    writable: true,
    value: MemoryStorage,
  });
};

installMemoryStorage("localStorage");
installMemoryStorage("sessionStorage");

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation(
    (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  ),
});
