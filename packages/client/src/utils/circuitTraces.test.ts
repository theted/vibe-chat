import { describe, expect, it } from "vitest";
import {
  PAD_RADIUS,
  buildTraceBundle,
  offsetPolyline,
  padsPath,
  routePoints,
  type Point,
} from "./circuitTraces";

// Distance from a point to the infinite line through a and b
const distanceToLine = ([px, py]: Point, [ax, ay]: Point, [bx, by]: Point) =>
  Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) /
  Math.hypot(bx - ax, by - ay);

const parsePath = (d: string): Point[] =>
  [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(
    ([, x, y]) => [Number(x), Number(y)] as const,
  );

describe("routePoints", () => {
  it("walks legs from the start, measuring diagonals along the axis", () => {
    expect(
      routePoints(
        [0, 100],
        [
          ["E", 50],
          ["NE", 20],
          ["S", 10],
        ],
      ),
    ).toEqual([
      [0, 100],
      [50, 100],
      [70, 80],
      [70, 90],
    ]);
  });
});

describe("offsetPolyline", () => {
  it("keeps every segment the same distance away through a 45° bend", () => {
    const centre = routePoints(
      [0, 0],
      [
        ["E", 40],
        ["SE", 30],
        ["E", 40],
      ],
    );
    const shifted = offsetPolyline(centre, 10);

    shifted.slice(1).forEach((point, index) => {
      const segmentStart = shifted[index];
      expect(
        distanceToLine(segmentStart, centre[index], centre[index + 1]),
      ).toBeCloseTo(10);
      expect(
        distanceToLine(point, centre[index], centre[index + 1]),
      ).toBeCloseTo(10);
    });
  });

  it("returns the line unchanged for a zero offset", () => {
    const line: Point[] = [
      [0, 0],
      [10, 0],
      [20, 10],
    ];
    expect(offsetPolyline(line, 0)).toEqual(line);
  });
});

describe("buildTraceBundle", () => {
  it("draws one parallel track per count, spaced by gap", () => {
    const { traces } = buildTraceBundle({
      start: [0, 50],
      route: [["E", 100]],
      count: 3,
      gap: 8,
      endPad: false,
    });

    expect(traces.map((d) => parsePath(d)[0][1])).toEqual([42, 50, 58]);
  });

  it("puts pads at track ends and stops each track at the pad's rim", () => {
    const { traces, pads } = buildTraceBundle({
      start: [0, 0],
      route: [["E", 50]],
      startPad: true,
    });

    expect(pads).toEqual([
      [0, 0],
      [50, 0],
    ]);
    expect(parsePath(traces[0])).toEqual([
      [PAD_RADIUS, 0],
      [50 - PAD_RADIUS, 0],
    ]);
  });

  it("fans the pads out by lengthening each track's last leg", () => {
    const fanEnds = (stagger: number) =>
      buildTraceBundle({
        start: [0, 0],
        route: [["E", 50]],
        count: 3,
        stagger,
      }).pads.map(([x]) => x);

    expect(fanEnds(10)).toEqual([50, 60, 70]);
    expect(fanEnds(-10)).toEqual([70, 60, 50]);
  });

  it("rejects a route without legs", () => {
    expect(() => buildTraceBundle({ start: [0, 0], route: [] })).toThrow(
      /at least one leg/,
    );
  });
});

describe("padsPath", () => {
  it("draws each pad as a closed ring of two arcs", () => {
    expect(padsPath([[10, 20]], 4)).toBe("M6 20a4 4 0 1 0 8 0a4 4 0 1 0 -8 0");
  });

  it("is empty when there are no pads", () => {
    expect(padsPath([])).toBe("");
  });
});
