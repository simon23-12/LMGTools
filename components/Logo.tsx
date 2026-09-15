/**
 * Nachbau des LMG-Signets: zwei ueberlappende Sprechblasen in Blau
 * und Orange. Liegt die offizielle Datei vor, kann sie hier direkt
 * ersetzt werden — alles andere referenziert nur diese Komponente.
 */
export function LmgMark({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 46"
      width={size}
      height={(size * 46) / 64}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <g>
        <path
          d="M12.5 26.5 8.5 41.5 25 31.5Z"
          fill="var(--lmg-blue)"
        />
        <ellipse cx="23" cy="17" rx="21.5" ry="14.5" fill="var(--lmg-blue)" />
      </g>
      <g>
        <path
          d="M50 32 55.5 44 40 36.5Z"
          fill="var(--lmg-orange)"
        />
        <ellipse cx="44" cy="26" rx="18.5" ry="12.5" fill="var(--lmg-orange)" />
      </g>
    </svg>
  );
}

export function LmgLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LmgMark size={30} />
      <span className="font-display text-[1.35rem] font-extrabold leading-none tracking-tight">
        <span style={{ color: "var(--lmg-blue)" }}>LM</span>
        <span style={{ color: "var(--lmg-orange)" }}>G</span>
      </span>
    </span>
  );
}
