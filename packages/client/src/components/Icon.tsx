/**
 * Icon Component
 * Renders SVG icons using the modern design system.
 */

import type { IconProps, IconName, IconStyleVariant } from '@/types';
import { ICON_PATHS, DEFAULT_ICON_VARIANT } from '@/config/iconPaths';

const Icon = ({
  name = 'sparkle',
  className = '',
  strokeWidth,
  styleVariant,
  paths,
  ...rest
}: IconProps) => {
  const iconDefinition = ICON_PATHS[name as IconName] || ICON_PATHS.sparkle;

  if (!iconDefinition) {
    return null;
  }

  const resolved = paths
    ? { paths, strokeWidth: strokeWidth || 1.5 }
    : iconDefinition[styleVariant || DEFAULT_ICON_VARIANT] ||
      iconDefinition.modern ||
      iconDefinition.classic ||
      null;

  if (!resolved) {
    return null;
  }

  const finalStrokeWidth = strokeWidth ?? resolved.strokeWidth ?? 1.5;

  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={finalStrokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {resolved.paths.map((d, idx) => (
        <path key={`${name}-${idx}`} d={d} />
      ))}
    </svg>
  );
};

export default Icon;
