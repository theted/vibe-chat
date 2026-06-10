import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getStorageItem,
  getStorageJson,
  removeStorageItem,
  setStorageItem,
  setStorageJson,
} from "./storage";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("storage helpers", () => {
  it("round-trips string values", () => {
    expect(setStorageItem("key", "value")).toBe(true);
    expect(getStorageItem("key")).toBe("value");
    expect(removeStorageItem("key")).toBe(true);
    expect(getStorageItem("key")).toBeNull();
  });

  it("round-trips JSON values", () => {
    const value = { items: [1, 2, 3], label: "hi" };
    expect(setStorageJson("json", value)).toBe(true);
    expect(getStorageJson<typeof value>("json")).toEqual(value);
  });

  it("returns null for missing or corrupt JSON without throwing", () => {
    expect(getStorageJson("missing")).toBeNull();
    localStorage.setItem("corrupt", "{not json");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(getStorageJson("corrupt")).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it("warns and returns safe defaults when localStorage throws", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(setStorageItem("key", "value")).toBe(false);
    expect(warn).toHaveBeenCalled();
  });
});
