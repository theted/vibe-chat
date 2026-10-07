/**
 * LogoMark - the spinner's voice bars standing still, so the loader and the
 * header share one mark.
 */

import type { CSSProperties } from "react";
import { SPINNER_HUES } from "@/config/voices";

// Heights read as a beat of speech rather than a bar chart
const BAR_HEIGHTS = ["55%", "100%", "70%", "38%"] as const;

const BAR_STYLES: CSSProperties[] = BAR_HEIGHTS.map(
  (height, index) =>
    ({ height, "--voice-h": SPINNER_HUES[index] }) as CSSProperties,
);

const LogoMark = ({ className = "" }: { className?: string }) => (
  <span className={`logo-mark ${className}`.trim()} aria-hidden="true">
    {BAR_STYLES.map((style, index) => (
      <span key={index} style={style} />
    ))}
  </span>
);

export default LogoMark;
