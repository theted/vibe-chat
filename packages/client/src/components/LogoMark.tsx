/**
 * LogoMark - a V drawn as two circuit traces ending in ring pads, glowing
 * like the backdrop's board. The animated variant is the loader: signals in
 * different voice colours run along the traces, so the loader and the
 * header still share one mark.
 */

import type { CSSProperties } from "react";
import { LOGO_SIGNAL_HUES } from "@/config/voices";
import { voiceStyle } from "@/utils/voice";
import type { Point } from "@/utils/circuitTraces";

// Outer V with kinked tops, inner V parallel to it 6 units in. Mirrored in
// public/favicon.svg - keep the two in step.
const LOGO_TRACES = [
  "M5 8.2V11.5L24 44L43 11.5V8.2",
  "M13.4 14L24 32.1L33.4 16V11.2",
] as const;

const LOGO_PADS: readonly Point[] = [
  [5, 5.6],
  [43, 5.6],
  [12.1, 11.8],
  [33.4, 8.6],
];

const LOGO_PAD_RADIUS = 2.6;

// Both traces carry signals, offset so one is always on its way
const SIGNAL_STYLES: CSSProperties[] = LOGO_TRACES.map((_, index) => ({
  ...voiceStyle(LOGO_SIGNAL_HUES[index]),
  animationDelay: `${index * -0.7}s`,
}));

interface LogoMarkProps {
  className?: string;
  isAnimated?: boolean;
}

const LogoMark = ({ className = "", isAnimated = false }: LogoMarkProps) => (
  <svg
    viewBox="0 0 48 48"
    className={`logo-mark ${className}`.trim()}
    aria-hidden="true"
  >
    {LOGO_TRACES.map((d) => (
      <path key={d} d={d} />
    ))}
    {LOGO_PADS.map(([cx, cy]) => (
      <circle key={`${cx},${cy}`} cx={cx} cy={cy} r={LOGO_PAD_RADIUS} />
    ))}
    {isAnimated &&
      LOGO_TRACES.map((d, index) => (
        <path
          key={`signal-${d}`}
          className="logo-signal"
          d={d}
          pathLength={100}
          style={SIGNAL_STYLES[index]}
        />
      ))}
  </svg>
);

export default LogoMark;
