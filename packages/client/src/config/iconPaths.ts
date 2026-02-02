/**
 * Icon SVG path definitions
 * Extracted from Icon component for cleaner separation of concerns
 */

import type { IconDefinition, IconName } from "@/types";

export const ICON_PATHS: Record<IconName, IconDefinition> = {
  chat: {
    classic: {
      strokeWidth: 2,
      paths: [
        "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
      ],
    },
    modern: {
      strokeWidth: 1.4,
      paths: ["M5 6.5h14v7H14.5L12 17l-2.5-3.5H5z", "M8.5 9.5h7", "M8.5 12h4"],
    },
  },
  topic: {
    classic: {
      strokeWidth: 2,
      paths: [
        "M7 8h10",
        "M7 12h4",
        "M12 20l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-1.586L12 20z",
      ],
    },
    modern: {
      strokeWidth: 1.4,
      paths: [
        "M5 6.25h14v8.25h-3.6L12 18.5l-3.4-4h-3.6z",
        "M7.75 9h8.5",
        "M7.75 11.75h5.25",
      ],
    },
  },
  "arrow-down": {
    classic: {
      strokeWidth: 2,
      paths: ["M19 14l-7 7m0 0l-7-7m7 7V3"],
    },
    modern: {
      strokeWidth: 1.4,
      paths: ["M12 4.75v14.5", "M6 12.75l6 6 6-6"],
    },
  },
  participants: {
    classic: {
      strokeWidth: 2,
      paths: [
        "M12 4.354a4 4 0 110 5.292",
        "M15 21H3v-1a6 6 0 0112 0v1z",
        "M15 21h6v-1a6 6 0 00-9-5.197",
        "M21.5 6.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z",
      ],
    },
    modern: {
      strokeWidth: 1.4,
      paths: [
        "M8.5 7.5a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z",
        "M5 18.5c0-3.59 2.91-6.5 6.5-6.5S18 14.91 18 18.5",
        "M19.5 9.5a2.25 2.25 0 10-4.5 0",
        "M19.5 18.25c0-1.98-1.05-3.7-2.62-4.62",
      ],
    },
  },
  users: {
    classic: {
      strokeWidth: 2,
      paths: [
        "M16 7a4 4 0 11-8 0 4 4 0 018 0z",
        "M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
      ],
    },
    modern: {
      strokeWidth: 1.4,
      paths: [
        "M9 7a3 3 0 116 0 3 3 0 01-6 0z",
        "M4.75 18.5c0-3.313 2.937-6 7.25-6s7.25 2.687 7.25 6",
      ],
    },
  },
  monitor: {
    classic: {
      strokeWidth: 2,
      paths: [
        "M9.75 17L9 20l-1 1h8l-1-1-.75-3",
        "M3 13h18",
        "M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
      ],
    },
    modern: {
      strokeWidth: 1.4,
      paths: [
        "M4.5 5.5h15a1.5 1.5 0 011.5 1.5v8a1.5 1.5 0 01-1.5 1.5h-4.25L12 19.25l-3.25-2.75H4.5a1.5 1.5 0 01-1.5-1.5v-8a1.5 1.5 0 011.5-1.5z",
        "M8.75 20.5h6.5",
      ],
    },
  },
  info: {
    classic: {
      strokeWidth: 2,
      paths: [
        "M16 12a4 4 0 10-8 0 4 4 0 008 0z",
        "M16 12v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9",
        "M15.5 19.044A8.959 8.959 0 0111 20.25",
      ],
    },
    modern: {
      strokeWidth: 1.4,
      paths: [
        "M12 4.5a7.5 7.5 0 11-3.54 14.21",
        "M12 8.5h.01",
        "M11.25 11.75h1.5v4",
        "M18 11.5a2 2 0 104 0 2 2 0 10-4 0z",
      ],
    },
  },
  cog: {
    classic: {
      strokeWidth: 2,
      paths: [
        "M11.983 7.25a4.75 4.75 0 100 9.5 4.75 4.75 0 000-9.5z",
        "M3.5 12h1.75",
        "M18.75 12H20.5",
        "M12 3.5v1.75",
        "M12 18.75V20.5",
        "M5.7 5.7l1.25 1.25",
        "M17.05 17.05l1.25 1.25",
        "M5.7 18.3l1.25-1.25",
        "M17.05 6.95l1.25-1.25",
      ],
    },
    modern: {
      strokeWidth: 1.4,
      paths: [
        "M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z",
        "M4.25 12h1.5",
        "M18.25 12h1.5",
        "M12 4.25v1.5",
        "M12 18.25v1.5",
        "M6.35 6.35l1.05 1.05",
        "M16.6 16.6l1.05 1.05",
        "M6.35 17.65l1.05-1.05",
        "M16.6 7.4l1.05-1.05",
      ],
    },
  },
  dashboard: {
    classic: {
      strokeWidth: 2,
      paths: [
        "M3 13h8V3H3v10z",
        "M13 21h8v-6h-8v6z",
        "M13 3h8v8h-8V3z",
        "M3 21h8v-6H3v6z",
      ],
    },
    modern: {
      strokeWidth: 1.4,
      paths: [
        "M4.5 12.5h7v-7h-7v7z",
        "M12.5 19.5h7v-5h-7v5z",
        "M12.5 5.5h7v6h-7v-6z",
        "M4.5 19.5h7v-5h-7v5z",
      ],
    },
  },
  logout: {
    classic: {
      strokeWidth: 2,
      paths: [
        "M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4",
        "M10 17l5-5-5-5",
        "M15 12H3",
      ],
    },
    modern: {
      strokeWidth: 1.4,
      paths: [
        "M15.5 5.5h3.25a1.75 1.75 0 011.75 1.75v9.5a1.75 1.75 0 01-1.75 1.75H15.5",
        "M10.5 8.75l3.75 3.25-3.75 3.25",
        "M14.25 12H4.5",
      ],
    },
  },
  "chevron-right": {
    classic: {
      strokeWidth: 2,
      paths: ["M13 7l5 5-5 5", "M18 12H6"],
    },
    modern: {
      strokeWidth: 1.4,
      paths: ["M10 6.5l5.5 5.5L10 17.5"],
    },
  },
  "x-mark": {
    classic: {
      strokeWidth: 2,
      paths: ["M6 18L18 6", "M6 6l12 12"],
    },
    modern: {
      strokeWidth: 1.4,
      paths: ["M7 7l10 10", "M17 7L7 17"],
    },
  },
  send: {
    classic: {
      strokeWidth: 2,
      paths: ["M12 19l9 2-9-18-9 18 9-2z", "M12 19v-8"],
    },
    modern: {
      strokeWidth: 1.4,
      paths: ["M4.75 19.25L20 12 4.75 4.75 8 11.5l4 0.5-4 0.5z"],
    },
  },
  sparkle: {
    classic: {
      strokeWidth: 2,
      paths: [
        "M12 3v4",
        "M12 17v4",
        "M4.22 4.22l2.83 2.83",
        "M16.95 16.95l2.83 2.83",
        "M3 12h4",
        "M17 12h4",
        "M4.22 19.78l2.83-2.83",
        "M16.95 7.05l2.83-2.83",
      ],
    },
    modern: {
      strokeWidth: 1.4,
      paths: ["M12 4l1.5 3.5L17 9l-3.5 1.5L12 14l-1.5-3.5L7 9l3.5-1.5L12 4z"],
    },
  },
  moon: {
    classic: {
      strokeWidth: 2,
      paths: ["M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"],
    },
    modern: {
      strokeWidth: 1.4,
      paths: [
        "M15.5 3.75a7.75 7.75 0 100 16.5 7.25 7.25 0 01-7.25-7.25 7.25 7.25 0 017.25-7.25z",
      ],
    },
  },
  sun: {
    classic: {
      strokeWidth: 2,
      paths: [
        "M12 4V2",
        "M12 22v-2",
        "M5.22 5.22L3.8 3.8",
        "M20.2 20.2l-1.42-1.42",
        "M4 12H2",
        "M22 12h-2",
        "M5.22 18.78L3.8 20.2",
        "M20.2 3.8l-1.42 1.42",
        "M12 18a6 6 0 110-12 6 6 0 010 12z",
      ],
    },
    modern: {
      strokeWidth: 1.4,
      paths: [
        "M12 6.25a5.75 5.75 0 110 11.5 5.75 5.75 0 010-11.5z",
        "M12 2.5v1.5",
        "M12 20v1.5",
        "M4.22 4.22l1.06 1.06",
        "M18.72 18.72l1.06 1.06",
        "M2.5 12h1.5",
        "M20 12h1.5",
        "M4.22 19.78l1.06-1.06",
        "M18.72 5.28l1.06-1.06",
      ],
    },
  },
  alert: {
    classic: {
      strokeWidth: 2,
      paths: [
        "M12 9v4",
        "M12 17h.01",
        "M10.29 3.86L1.82 18a1.5 1.5 0 001.29 2.25h17.78A1.5 1.5 0 0022.18 18L13.71 3.86a1.5 1.5 0 00-2.42 0z",
      ],
    },
    modern: {
      strokeWidth: 1.6,
      paths: [
        "M12 8.25v5.5",
        "M12 17.5h.01",
        "M3.75 19.25h16.5l-8.25-14.5-8.25 14.5z",
      ],
    },
  },
  tag: {
    classic: {
      strokeWidth: 2,
      paths: [
        "M7 7h.01",
        "M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a.997.997 0 01-1.414 0l-7-7A1.997 1.997 0 013 12V7a4 4 0 014-4z",
      ],
    },
    modern: {
      strokeWidth: 1.4,
      paths: ["M6 6.25h5.5L18.5 13.25 11.5 20.25H6V6.25z", "M8.75 9.5h.01"],
    },
  },
};

export const DEFAULT_ICON_VARIANT = "modern" as const;
