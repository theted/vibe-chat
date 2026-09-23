/**
 * Spinner - a few bars in different voice colours rising in turn, like
 * people taking turns in the room. Used for loading and for "is typing".
 */

import type { CSSProperties } from "react";
import { SPINNER_HUES } from "@/config/voices";

type SpinnerSize = "sm" | "lg";

const SIZE_CONFIG: Record<SpinnerSize, { bars: number; style: CSSProperties }> =
  {
    sm: {
      bars: 3,
      style: {
        "--bar-height": "12px",
        "--bar-width": "3px",
        "--bar-gap": "2px",
      } as CSSProperties,
    },
    lg: {
      bars: 7,
      style: {
        "--bar-height": "44px",
        "--bar-width": "6px",
        "--bar-gap": "6px",
      } as CSSProperties,
    },
  };

interface SpinnerProps {
  size?: SpinnerSize;
  /** Fixed hue for every bar, e.g. the voice of the model that is typing */
  hue?: number;
  label?: string;
  className?: string;
}

const Spinner = ({ size = "sm", hue, label, className = "" }: SpinnerProps) => {
  const { bars, style } = SIZE_CONFIG[size];

  return (
    <span
      className={`voice-bars ${className}`.trim()}
      style={style}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {Array.from({ length: bars }, (_, index) => (
        <span
          key={index}
          style={
            {
              "--bar-index": index,
              "--voice-h": hue ?? SPINNER_HUES[index % SPINNER_HUES.length],
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
};

export default Spinner;
