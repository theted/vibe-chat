import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import LogoMark from "./LogoMark";

describe("LogoMark", () => {
  it("draws the V as two traces with four pads, hidden from assistive tech", () => {
    const { container } = render(<LogoMark className="h-8 w-8" />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveClass("logo-mark", "h-8", "w-8");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg?.querySelectorAll("path")).toHaveLength(2);
    expect(svg?.querySelectorAll("circle")).toHaveLength(4);
  });

  it("only runs signals along the traces when animated", () => {
    const { container, rerender } = render(<LogoMark />);
    expect(container.querySelectorAll(".logo-signal")).toHaveLength(0);

    rerender(<LogoMark isAnimated />);
    const signals = container.querySelectorAll(".logo-signal");
    expect(signals).toHaveLength(2);
    signals.forEach((signal) =>
      expect(signal).toHaveAttribute("pathLength", "100"),
    );
  });
});
