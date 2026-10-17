/**
 * Circuit traces - expands compact route specs into SVG path data: a bundle
 * of parallel tracks that bend together and end in ring pads, like the
 * copper on a circuit board. Pure geometry so the backdrop config stays a
 * readable list of routes instead of hand-written coordinates.
 */

export type Direction = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
export type Point = readonly [x: number, y: number];
/** Diagonal legs are measured along the axis, so corners stay on whole numbers */
export type Leg = readonly [direction: Direction, length: number];

export interface TraceBundleSpec {
  start: Point;
  route: readonly Leg[];
  /** Parallel tracks in the bundle */
  count?: number;
  /** Distance between neighbouring tracks */
  gap?: number;
  /** Each track's last leg runs this much further than its neighbour's, so
   *  the pads fan out instead of lining up. Negative fans the other way. */
  stagger?: number;
  /** Most bundles run in from the screen edge, so only the far end has pads */
  startPad?: boolean;
  endPad?: boolean;
}

export interface TraceBundle {
  /** One path per track, in bundle order */
  traces: string[];
  pads: Point[];
}

export const DEFAULT_TRACE_GAP = 10;
export const PAD_RADIUS = 4;

const STEPS: Record<Direction, Point> = {
  N: [0, -1],
  NE: [1, -1],
  E: [1, 0],
  SE: [1, 1],
  S: [0, 1],
  SW: [-1, 1],
  W: [-1, 0],
  NW: [-1, -1],
};

const unit = ([x, y]: Point): Point => {
  const length = Math.hypot(x, y);
  return [x / length, y / length];
};

// Left-hand normal; offsetting along it moves a track sideways
const normal = ([x, y]: Point): Point => [-y, x];

const round = (value: number) => Math.round(value * 10) / 10;

const formatPath = (points: Point[]) =>
  points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"}${round(x)} ${round(y)}`)
    .join(" ");

/** Corner points of the route's centre line */
export const routePoints = (start: Point, route: readonly Leg[]): Point[] =>
  route.reduce<Point[]>(
    (points, [direction, length]) => {
      const [x, y] = points[points.length - 1];
      const [dx, dy] = STEPS[direction];
      return [...points, [x + dx * length, y + dy * length]];
    },
    [start],
  );

/**
 * Shifts a polyline sideways by `distance`, mitring the corners so every
 * track in a bundle stays exactly `gap` from its neighbour through bends.
 */
export const offsetPolyline = (points: Point[], distance: number): Point[] => {
  const normals = points
    .slice(1)
    .map((point, index) =>
      normal(unit([point[0] - points[index][0], point[1] - points[index][1]])),
    );

  return points.map(([x, y], index) => {
    const before = normals[index - 1] ?? normals[index];
    const after = normals[index] ?? normals[index - 1];
    // Miter vector: bisects the two normals, lengthened so the offset
    // measured perpendicular to each segment is still `distance`
    const scale = distance / (1 + before[0] * after[0] + before[1] * after[1]);
    return [
      x + (before[0] + after[0]) * scale,
      y + (before[1] + after[1]) * scale,
    ];
  });
};

// Moves a track's end back so it meets the pad's rim rather than its centre
const pullBack = (from: Point, toward: Point, by: number): Point => {
  const [ux, uy] = unit([toward[0] - from[0], toward[1] - from[1]]);
  return [from[0] + ux * by, from[1] + uy * by];
};

/** Expands one bundle spec into its track paths and pad centres. */
export const buildTraceBundle = ({
  start,
  route,
  count = 1,
  gap = DEFAULT_TRACE_GAP,
  stagger = 0,
  startPad = false,
  endPad = true,
}: TraceBundleSpec): TraceBundle => {
  if (route.length === 0) throw new Error("Trace route needs at least one leg");

  const lastLeg = route.length - 1;
  const tracks = Array.from({ length: count }, (_, index) => {
    const fanIndex = stagger >= 0 ? index : count - 1 - index;
    const legs = route.map(
      ([direction, length], legIndex): Leg =>
        legIndex === lastLeg
          ? [direction, length + fanIndex * Math.abs(stagger)]
          : [direction, length],
    );
    return offsetPolyline(
      routePoints(start, legs),
      (index - (count - 1) / 2) * gap,
    );
  });

  const pads = tracks.flatMap((points) => [
    ...(startPad ? [points[0]] : []),
    ...(endPad ? [points[points.length - 1]] : []),
  ]);

  const traces = tracks.map((points) => {
    const trimmed = [...points];
    if (startPad) trimmed[0] = pullBack(points[0], points[1], PAD_RADIUS);
    if (endPad) {
      const last = points.length - 1;
      trimmed[last] = pullBack(points[last], points[last - 1], PAD_RADIUS);
    }
    return formatPath(trimmed);
  });

  return { traces, pads };
};

/** All pads as one path of ring outlines - one DOM node instead of dozens. */
export const padsPath = (pads: readonly Point[], radius = PAD_RADIUS) =>
  pads
    .map(
      ([x, y]) =>
        `M${round(x - radius)} ${round(y)}a${radius} ${radius} 0 1 0 ${radius * 2} 0a${radius} ${radius} 0 1 0 ${-radius * 2} 0`,
    )
    .join("");
