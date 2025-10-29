import React, { useId } from "react";

const CircuitIcon = ({ className = "", title = "Stylized AI circuit", ...rest }) => {
  const gradientId = useId();

  return (
    <svg
      viewBox="0 0 340 340"
      className={className}
      role="img"
      aria-label={title}
      {...rest}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.65" />
        </linearGradient>
      </defs>
      <rect x="50" y="50" width="240" height="240" rx="48" fill="none" stroke={`url(#${gradientId})`} strokeWidth="8" />
      <rect x="105" y="105" width="130" height="130" rx="26" fill="none" stroke={`url(#${gradientId})`} strokeWidth="6" />
      <circle cx="170" cy="170" r="46" fill={`url(#${gradientId})`} opacity="0.95" />
      <g stroke={`url(#${gradientId})`} strokeWidth="10" strokeLinecap="round">
        <line x1="170" y1="20" x2="170" y2="60" />
        <line x1="170" y1="280" x2="170" y2="320" />
        <line x1="20" y1="170" x2="60" y2="170" />
        <line x1="280" y1="170" x2="320" y2="170" />
      </g>
      <g stroke={`url(#${gradientId})`} strokeWidth="6" strokeLinecap="round">
        <line x1="70" y1="110" x2="40" y2="80" />
        <line x1="270" y1="110" x2="300" y2="80" />
        <line x1="70" y1="230" x2="40" y2="260" />
        <line x1="270" y1="230" x2="300" y2="260" />
      </g>
    </svg>
  );
};

export default CircuitIcon;
