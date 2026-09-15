import type { SVGProps } from "react";

/**
 * Handgezeichnetes Icon-Set — bewusst ohne Bibliothek, damit das
 * Bundle klein bleibt und die Strichstaerke ueberall gleich wirkt.
 * Alle Pfade leben im 24er-Raster und erben currentColor.
 */
const PATHS: Record<string, React.ReactNode> = {
  timer: (
    <>
      <path d="M9.5 2.75h5" />
      <circle cx="12" cy="13.5" r="7.75" />
      <path d="M12 9.75v3.75l2.5 1.75" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9.25" />
      <path d="M12 6.5V12l3.75 2.25" />
    </>
  ),
  rotate: (
    <>
      <path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.12" />
      <path d="M20.9 3.9v4.4h-4.4" />
    </>
  ),
  traffic: (
    <>
      <rect x="6.75" y="2.75" width="10.5" height="18.5" rx="4" />
      <circle cx="12" cy="7.4" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="16.6" r="1.5" />
    </>
  ),
  phases: (
    <>
      <path d="M4 6.5h6.5" />
      <path d="M4 12h11" />
      <path d="M4 17.5h16" />
      <circle cx="13.5" cy="6.5" r="1.4" />
      <circle cx="18" cy="12" r="1.4" />
    </>
  ),
  groups: (
    <>
      <circle cx="7" cy="7.5" r="3.1" />
      <circle cx="17" cy="7.5" r="3.1" />
      <circle cx="12" cy="16.75" r="3.1" />
      <path d="M9.6 9.7 10.9 13M14.4 9.7 13.1 13M10.1 7.5h3.8" />
    </>
  ),
  mingle: (
    <>
      <circle cx="6.25" cy="6.25" r="2.75" />
      <circle cx="17.75" cy="17.75" r="2.75" />
      <path d="M11.25 5.25h3.5a4.5 4.5 0 0 1 4.5 4.5v1.5" />
      <path d="m17 9 2.25 2.5L21.5 9" />
      <path d="M12.75 18.75h-3.5a4.5 4.5 0 0 1-4.5-4.5v-1.5" />
      <path d="M7 15 4.75 12.5 2.5 15" />
    </>
  ),
  dice: (
    <>
      <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="4.5" />
      <circle cx="8.75" cy="8.75" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="15.25" cy="15.25" r="1.35" fill="currentColor" stroke="none" />
      <circle cx="15.25" cy="8.75" r="1.35" fill="currentColor" stroke="none" />
    </>
  ),
  display: (
    <>
      <rect x="2.75" y="4.25" width="18.5" height="12.5" rx="2.5" />
      <path d="M8 20.5h8M12 16.75v3.75" />
      <path d="M7.5 10.5h9" />
    </>
  ),
  board: (
    <>
      <rect x="2.75" y="3.75" width="18.5" height="13.5" rx="2.5" />
      <path d="M12 17.25v3.5" />
      <path d="m7.5 13 3-5.25L14 13" />
      <path d="M8.9 11h3.9" />
    </>
  ),
  seats: (
    <>
      <path d="M4 3.75h16" />
      <rect x="3.25" y="8" width="5" height="4.25" rx="1.4" />
      <rect x="9.5" y="8" width="5" height="4.25" rx="1.4" />
      <rect x="15.75" y="8" width="5" height="4.25" rx="1.4" />
      <rect x="3.25" y="15.5" width="5" height="4.25" rx="1.4" />
      <rect x="9.5" y="15.5" width="5" height="4.25" rx="1.4" />
      <rect x="15.75" y="15.5" width="5" height="4.25" rx="1.4" />
    </>
  ),
  broom: (
    <>
      <path d="M14.5 3.5 9 9" />
      <path d="M7.25 10.75 13.25 4.75" />
      <path d="m6 12.25 5.75 5.75" />
      <path d="M5.4 12.85 3.1 20.9l8.05-2.3z" />
      <path d="m16.5 5.5 2.5 2.5" />
    </>
  ),
  grades: (
    <>
      <path d="M5.25 3.75h9.5l4 4v12.5a1 1 0 0 1-1 1H5.25a1 1 0 0 1-1-1V4.75a1 1 0 0 1 1-1Z" />
      <path d="M14.25 3.9V8h4.1" />
      <path d="m8 14.25 2.25 2.25L15 11.75" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.5 19.5c0-3 2.5-5.25 5.5-5.25s5.5 2.25 5.5 5.25" />
      <path d="M16 5.1a3.25 3.25 0 0 1 0 6.05" />
      <path d="M17.4 14.6c1.9.7 3.1 2.5 3.1 4.9" />
    </>
  ),
  /* --- Bedienelemente --- */
  back: (
    <>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </>
  ),
  expand: (
    <>
      <path d="M3.75 9V3.75H9M15 3.75h5.25V9M20.25 15v5.25H15M9 20.25H3.75V15" />
    </>
  ),
  collapse: (
    <>
      <path d="M9 3.75V9H3.75M20.25 9H15V3.75M15 20.25V15h5.25M3.75 15H9v5.25" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4.25" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.28 4.28l1.56 1.56M18.16 18.16l1.56 1.56M2.5 12h2.2M19.3 12h2.2M4.28 19.72l1.56-1.56M18.16 5.84l1.56-1.56" />
    </>
  ),
  moon: <path d="M20.5 14.3A8.75 8.75 0 0 1 9.7 3.5a8.75 8.75 0 1 0 10.8 10.8Z" />,
  play: <path d="M7.5 4.9v14.2l11.4-7.1z" />,
  pause: (
    <>
      <rect x="6.5" y="4.75" width="4" height="14.5" rx="1.3" />
      <rect x="13.5" y="4.75" width="4" height="14.5" rx="1.3" />
    </>
  ),
  reset: (
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.12" />
      <path d="M3.1 3.9v4.4h4.4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  x: <path d="m6 6 12 12M18 6 6 18" />,
  trash: (
    <>
      <path d="M4 6.5h16" />
      <path d="M9.5 6.5v-1.75a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V6.5" />
      <path d="M6.25 6.5 7 19.75a1 1 0 0 0 1 .95h8a1 1 0 0 0 1-.95L17.75 6.5" />
      <path d="M10.5 10.25v6.5M13.5 10.25v6.5" />
    </>
  ),
  shuffle: (
    <>
      <path d="M17 4.5 20.5 8 17 11.5" />
      <path d="M17 12.5 20.5 16l-3.5 3.5" />
      <path d="M3.5 8h3.2c1.3 0 2.5.7 3.2 1.8l3.4 5.4c.7 1.1 1.9 1.8 3.2 1.8h3.5" />
      <path d="M3.5 16h3.2c1 0 2-.5 2.7-1.3" />
      <path d="M14.4 9.2c.6-.8 1.6-1.2 2.6-1.2h3.4" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="2.75" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3.25M9 21.25h6" />
    </>
  ),
  check: <path d="m5 12.5 4.75 4.75L19 7.5" />,
  star: (
    <path d="m12 3.6 2.6 5.55 5.9.79-4.3 4.3 1.06 6.16L12 17.5l-5.26 2.9L7.8 14.2l-4.3-4.3 5.9-.79z" />
  ),
  search: (
    <>
      <circle cx="10.75" cy="10.75" r="6.75" />
      <path d="m15.75 15.75 4.5 4.5" />
    </>
  ),
  grid: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.75 12 5.75 21.5 12 21.5 12 18 18.25 12 18.25 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  pen: (
    <>
      <path d="M16.5 3.9 20.1 7.5 8.4 19.2l-4.5.9.9-4.5z" />
      <path d="m14.4 6 3.6 3.6" />
    </>
  ),
  eraser: (
    <>
      <path d="m9.5 20.5-5-5a2 2 0 0 1 0-2.83l8-8a2 2 0 0 1 2.83 0l4.17 4.17a2 2 0 0 1 0 2.83l-8.83 8.83z" />
      <path d="M4.5 20.5h15" />
      <path d="m8 9 7 7" />
    </>
  ),
  volume: (
    <>
      <path d="M11 4.75 6.5 8.5h-3v7h3l4.5 3.75z" />
      <path d="M15.5 9.2a4 4 0 0 1 0 5.6" />
      <path d="M18.2 6.5a7.75 7.75 0 0 1 0 11" />
    </>
  ),
};

export type IconName = keyof typeof PATHS | string;

export function Icon({
  name,
  size = 24,
  ...props
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  const path = PATHS[name];
  if (!path) return null;
  const filled = name === "play" || name === "star" || name === "moon";
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {path}
    </svg>
  );
}
