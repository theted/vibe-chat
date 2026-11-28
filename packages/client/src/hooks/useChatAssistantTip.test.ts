import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { STORAGE_KEYS } from "@/constants/storage";
import { useChatAssistantTip } from "./useChatAssistantTip";

describe("useChatAssistantTip", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stays hidden until the composer is focused", () => {
    const { result } = renderHook(() => useChatAssistantTip());
    expect(result.current.isVisible).toBe(false);

    act(() => result.current.handleInputFocus());
    expect(result.current.isVisible).toBe(true);
  });

  it("remembers a dismissal across mounts", () => {
    const first = renderHook(() => useChatAssistantTip());
    act(() => first.result.current.handleInputFocus());
    act(() => first.result.current.dismiss());

    expect(first.result.current.isVisible).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.CHAT_TIP_SEEN)).not.toBeNull();

    const second = renderHook(() => useChatAssistantTip());
    act(() => second.result.current.handleInputFocus());
    expect(second.result.current.isVisible).toBe(false);
  });

  it.each(["@Chat how does routing work?", "hey @chat", "@CHAT"])(
    "counts writing %j as seen",
    (draft) => {
      const { result } = renderHook(() => useChatAssistantTip());
      act(() => result.current.handleInputFocus());
      act(() => result.current.dismissIfMentioned(draft));

      expect(result.current.isVisible).toBe(false);
      expect(localStorage.getItem(STORAGE_KEYS.CHAT_TIP_SEEN)).not.toBeNull();
    },
  );

  it.each(["hello", "@Chatty", "chat"])("ignores %j", (draft) => {
    const { result } = renderHook(() => useChatAssistantTip());
    act(() => result.current.handleInputFocus());
    act(() => result.current.dismissIfMentioned(draft));

    expect(result.current.isVisible).toBe(true);
  });

  it("hides the tip when storage can't be read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const { result } = renderHook(() => useChatAssistantTip());
    act(() => result.current.handleInputFocus());

    expect(result.current.isVisible).toBe(false);
  });

  it("still dismisses for the session when storage can't be written", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const { result } = renderHook(() => useChatAssistantTip());
    act(() => result.current.handleInputFocus());
    act(() => result.current.dismiss());

    expect(result.current.isVisible).toBe(false);
  });
});
