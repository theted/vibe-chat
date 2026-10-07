/**
 * CircuitBackdrop - glowing circuit traces running in from both screen edges
 * behind the transcript, fading out before they reach the text. Now and then
 * a signal pulse runs along a trace in one of the room's voice colours
 * (--room-h1..3), so the board lights up in the colours of who is talking.
 */

import type { CSSProperties, SVGProps } from "react";
import {
  CIRCUIT_PANEL_HEIGHT,
  CIRCUIT_PANEL_WIDTH,
  CIRCUIT_PULSE_CYCLE_S,
  LEFT_CIRCUIT_ROUTES,
  RIGHT_CIRCUIT_ROUTES,
  type CircuitRoute,
} from "@/config/circuitBackdrop";
import { ROOM_VOICE_COUNT } from "@/config/voices";
import { buildTraceBundle, padsPath } from "@/utils/circuitTraces";

type Side = "left" | "right";

const VIEW_BOX = `0 0 ${CIRCUIT_PANEL_WIDTH} ${CIRCUIT_PANEL_HEIGHT}`;
// Right-hand routes are authored from their own edge, then flipped
const MIRROR = `translate(${CIRCUIT_PANEL_WIDTH} 0) scale(-1 1)`;
// Each panel pins to its screen edge, so a narrow screen crops the inner end
const FRAME_PROPS: Record<Side, SVGProps<SVGSVGElement>> = {
  left: { viewBox: VIEW_BOX, preserveAspectRatio: "xMinYMid slice" },
  right: { viewBox: VIEW_BOX, preserveAspectRatio: "xMaxYMid slice" },
};

interface Pulse {
  d: string;
  style: CSSProperties;
}

// Routes are static, so the geometry is built once rather than per render
const buildPanel = (routes: CircuitRoute[]) => {
  const bundles = routes.map((route) => ({
    ...buildTraceBundle(route),
    pulseDelay: route.pulseDelay,
  }));

  // Consecutive pulses take turns through the room's hues
  const pulses = bundles
    .filter(({ pulseDelay }) => pulseDelay != null)
    .map(
      ({ traces, pulseDelay }, index): Pulse => ({
        d: traces[Math.floor(traces.length / 2)],
        style: {
          "--pulse-h": `var(--room-h${(index % ROOM_VOICE_COUNT) + 1})`,
          "--pulse-delay": `${pulseDelay}s`,
          "--pulse-cycle": `${CIRCUIT_PULSE_CYCLE_S}s`,
        } as CSSProperties,
      }),
    );

  return {
    traces: bundles.flatMap(({ traces }) => traces).join(" "),
    pads: padsPath(bundles.flatMap(({ pads }) => pads)),
    pulses,
  };
};

const PANELS: Record<Side, ReturnType<typeof buildPanel>> = {
  left: buildPanel(LEFT_CIRCUIT_ROUTES),
  right: buildPanel(RIGHT_CIRCUIT_ROUTES),
};

const CircuitPanel = ({ side }: { side: Side }) => {
  const { traces, pads, pulses } = PANELS[side];
  const frame = FRAME_PROPS[side];
  const transform = side === "right" ? MIRROR : undefined;

  return (
    <div className={`circuit-side circuit-side-${side}`}>
      {/* Static board and moving pulses are separate layers so a pulse
          never makes the browser repaint the glow filter of the whole board */}
      <svg className="circuit-board" {...frame}>
        <g transform={transform}>
          <path className="circuit-trace" d={traces} />
          <path className="circuit-pad" d={pads} />
        </g>
      </svg>
      <svg className="circuit-signals" {...frame}>
        <g transform={transform}>
          {pulses.map(({ d, style }) => (
            <g key={d} className="circuit-pulse" style={style}>
              <path className="circuit-pulse-halo" d={d} pathLength={100} />
              <path className="circuit-pulse-core" d={d} pathLength={100} />
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
};

const CircuitBackdrop = () => (
  <div className="circuit-backdrop" aria-hidden="true">
    <CircuitPanel side="left" />
    <CircuitPanel side="right" />
  </div>
);

export default CircuitBackdrop;
