import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import {
  LEFT_CIRCUIT_ROUTES,
  RIGHT_CIRCUIT_ROUTES,
} from "@/config/circuitBackdrop";
import CircuitBackdrop from "./CircuitBackdrop";

const pulseCount = (routes: { pulseDelay?: number }[]) =>
  routes.filter(({ pulseDelay }) => pulseDelay != null).length;

describe("CircuitBackdrop", () => {
  it("is decorative: hidden from assistive tech", () => {
    const { container } = render(<CircuitBackdrop />);
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });

  it("mirrors the right-hand panel so both are authored from their edge", () => {
    const { container } = render(<CircuitBackdrop />);
    const boardGroup = (side: string) =>
      container.querySelector(`.circuit-side-${side} .circuit-board g`);

    expect(boardGroup("left")).not.toHaveAttribute("transform");
    expect(boardGroup("right")?.getAttribute("transform")).toContain(
      "scale(-1 1)",
    );
  });

  it("runs one pulse per route that asks for one, in a room hue", () => {
    const { container } = render(<CircuitBackdrop />);
    const pulses = [
      ...container.querySelectorAll<SVGGElement>(".circuit-pulse"),
    ];

    expect(pulses).toHaveLength(
      pulseCount(LEFT_CIRCUIT_ROUTES) + pulseCount(RIGHT_CIRCUIT_ROUTES),
    );
    pulses.forEach((pulse) =>
      expect(pulse.style.getPropertyValue("--pulse-h")).toMatch(
        /^var\(--room-h[1-3]\)$/,
      ),
    );
  });
});
