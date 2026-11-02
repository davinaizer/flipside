import type { ReactNode } from "react";

/**
 * Stroke icons on a 24px grid, drawn inline so nothing is fetched from a third party (PRD
 * section 8). Icons are decorative: the label next to them is the accessible name.
 */
const ICONS = {
  library: <path d="M4 19.5V5a2 2 0 0 1 2-2h13v14H6a2 2 0 0 0-2 2.5Zm0 0A2.5 2.5 0 0 0 6.5 22H19v-5M9 7h6" />,
  progress: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  play: <path d="M8 5v14l11-7Z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  back: <path d="M15 6l-6 6 6 6" />,
  chevron: <path d="M9 6l6 6-6 6" />,
  home: <path d="M4 11l8-7 8 7v9H4ZM10 20v-6h4v6" />,
  volume: <path d="M5 9v6h4l5 4V5L9 9ZM17.5 8.5a5 5 0 0 1 0 7" />,
  check: <path d="M5 13l4 4L19 7" />,
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l3 3 5-6" />
    </>
  ),
  undo: <path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" />,
  refresh: <path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" />,
  trend: <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  wifiOff: <path d="M3 3l18 18M2 9a15 15 0 0 1 5-3M22 9a15 15 0 0 0-8-3.8M5 13a10 10 0 0 1 4-2.4M19 13a10 10 0 0 0-3-2M9 17a5 5 0 0 1 6 0" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
  switchProfile: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0M16 5.2a3 3 0 0 1 0 5.6M18 14.2a6 6 0 0 1 3 5.8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  calendar: <path d="M4 6h16v14H4ZM4 10h16M8 3v4M16 3v4" />,
  cards: <path d="M7 4h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM19 7.5l1 9.5" />,
  download: <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />,
  save: <path d="M5 4h11l3 3v13H5ZM8 4v5h7V4M8 20v-6h8v6" />,
  cloudCheck: <path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9.5 4 4 0 0 1 17 18ZM9 13l2.5 2.5L15.5 11" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {ICONS[name]}
    </svg>
  );
}

/** The Flipside mark: a flip card on the primary colour. Decorative; the wordmark beside it names the app. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary"
      style={{ width: size, height: size }}
    >
      <Icon name="cards" size={size * 0.55} />
    </span>
  );
}
