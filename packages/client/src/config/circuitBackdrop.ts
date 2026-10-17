/**
 * Circuit backdrop - trace routes for the two panels that run in from the
 * screen edges behind the transcript. Coordinates are in each panel's
 * viewBox with x = 0 at the screen edge, so the right panel is authored the
 * same way and mirrored when drawn.
 */

import type { TraceBundleSpec } from "@/utils/circuitTraces";

export const CIRCUIT_PANEL_WIDTH = 560;
export const CIRCUIT_PANEL_HEIGHT = 1000;

/** A route plus, optionally, a signal pulse running along its middle track */
export interface CircuitRoute extends TraceBundleSpec {
  /** Seconds before this route's first pulse; omit for no pulse */
  pulseDelay?: number;
}

export const LEFT_CIRCUIT_ROUTES: CircuitRoute[] = [
  {
    start: [0, 118],
    route: [
      ["E", 64],
      ["SE", 46],
      ["E", 60],
    ],
    count: 4,
    stagger: 14,
    pulseDelay: 1,
  },
  {
    start: [0, 300],
    route: [
      ["E", 128],
      ["NE", 38],
      ["E", 36],
    ],
    count: 3,
    stagger: -12,
  },
  {
    start: [0, 452],
    route: [
      ["E", 42],
      ["SE", 74],
      ["E", 58],
      ["SE", 26],
    ],
    count: 5,
    stagger: 12,
    pulseDelay: 6,
  },
  {
    start: [40, 342],
    route: [
      ["E", 50],
      ["SE", 30],
    ],
    startPad: true,
  },
  {
    start: [0, 600],
    route: [
      ["E", 150],
      ["SE", 30],
    ],
    count: 2,
    stagger: 12,
  },
  {
    start: [0, 712],
    route: [
      ["E", 84],
      ["NE", 54],
      ["E", 64],
    ],
    count: 3,
    stagger: 14,
  },
  {
    start: [72, 1000],
    route: [
      ["N", 92],
      ["NE", 46],
      ["N", 40],
    ],
    count: 4,
    stagger: -10,
    pulseDelay: 11,
  },
  {
    start: [226, 1000],
    route: [
      ["N", 54],
      ["NE", 32],
      ["E", 54],
    ],
    count: 2,
    stagger: 16,
  },
];

export const RIGHT_CIRCUIT_ROUTES: CircuitRoute[] = [
  {
    start: [0, 206],
    route: [
      ["E", 92],
      ["SE", 38],
      ["E", 70],
    ],
    count: 3,
    stagger: -14,
    pulseDelay: 3.5,
  },
  {
    start: [168, 0],
    route: [
      ["S", 58],
      ["SW", 28],
      ["S", 26],
    ],
    count: 4,
    stagger: 10,
  },
  {
    start: [0, 384],
    route: [
      ["E", 54],
      ["NE", 40],
      ["E", 104],
    ],
    count: 4,
    stagger: 12,
  },
  {
    start: [36, 440],
    route: [
      ["E", 44],
      ["SE", 26],
    ],
    startPad: true,
  },
  {
    start: [0, 505],
    route: [
      ["E", 64],
      ["NE", 22],
      ["E", 30],
    ],
    count: 2,
    stagger: 10,
  },
  {
    start: [0, 590],
    route: [
      ["E", 116],
      ["SE", 52],
      ["S", 46],
    ],
    count: 5,
    stagger: -10,
    pulseDelay: 8.5,
  },
  {
    start: [0, 846],
    route: [
      ["E", 50],
      ["NE", 36],
      ["E", 88],
    ],
    count: 3,
    stagger: 14,
  },
  {
    start: [262, 1000],
    route: [
      ["N", 62],
      ["NW", 30],
      ["N", 34],
    ],
    count: 3,
    stagger: -12,
    pulseDelay: 13,
  },
];

// A pulse crosses its route in a fraction of the cycle and then waits, so at
// most one or two are moving at a time - ambient, not busy
export const CIRCUIT_PULSE_CYCLE_S = 15;
