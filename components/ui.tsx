"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "./Icons";

/* Jede Seite setzt --accent; alles Farbige leitet sich davon ab. */
const ACCENT = "var(--accent, var(--lmg-blue))";

type Variant = "primary" | "soft" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-11 px-4 text-[0.95rem] gap-2 rounded-xl",
  lg: "h-14 px-6 text-lg gap-2.5 rounded-2xl",
};

export function Button({
  variant = "soft",
  size = "md",
  icon,
  children,
  className = "",
  style,
  ...props
}: {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex select-none items-center justify-center font-medium transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40";

  const styles: Record<Variant, React.CSSProperties> = {
    primary: { background: ACCENT, color: "#fff" },
    soft: {
      background: `color-mix(in srgb, ${ACCENT} 13%, transparent)`,
      color: ACCENT,
    },
    ghost: { color: "var(--ink-muted)" },
    outline: {
      border: "1px solid var(--line-strong)",
      color: "var(--ink)",
    },
    danger: {
      background: "color-mix(in srgb, var(--alert) 13%, transparent)",
      color: "var(--alert)",
    },
  };

  const hover: Record<Variant, string> = {
    primary: "hover:brightness-110 shadow-[var(--shadow-sm)]",
    soft: "hover:brightness-105",
    ghost: "hover:bg-surface-2 hover:text-ink",
    outline: "hover:bg-surface-2",
    danger: "hover:brightness-105",
  };

  return (
    <button
      className={`${base} ${SIZES[size]} ${hover[variant]} ${className}`}
      style={{ ...styles[variant], ...style }}
      {...props}
    >
      {icon ? <Icon name={icon} size={size === "lg" ? 22 : 18} /> : null}
      {children}
    </button>
  );
}

export function IconButton({
  icon,
  label,
  size = 20,
  className = "",
  ...props
}: {
  icon: IconName;
  label: string;
  size?: number;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`grid size-10 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-ink active:scale-95 ${className}`}
      {...props}
    >
      <Icon name={icon} size={size} />
    </button>
  );
}

export function Panel({
  children,
  className = "",
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-surface shadow-[var(--shadow-sm)] ${className}`}
    >
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h2 className="font-display text-[0.95rem] font-semibold">{title}</h2>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[0.8rem] font-semibold tracking-wide text-muted uppercase">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block text-sm text-muted">{hint}</span> : null}
    </label>
  );
}

export function TextInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-11 w-full rounded-xl border border-line bg-surface-2 px-3.5 text-[0.95rem] text-ink outline-none transition placeholder:text-muted/70 focus:border-transparent ${className}`}
      {...props}
    />
  );
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="tablist"
      className="inline-flex gap-1 rounded-xl border border-line bg-surface-2 p-1"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 rounded-lg font-medium transition ${
              size === "sm" ? "h-8 px-2.5 text-sm" : "h-9 px-3.5 text-[0.9rem]"
            } ${active ? "shadow-[var(--shadow-sm)]" : "text-muted hover:text-ink"}`}
            style={
              active
                ? { background: "var(--surface)", color: ACCENT }
                : undefined
            }
          >
            {o.icon ? <Icon name={o.icon} size={16} /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="inline-flex h-11 items-center rounded-xl border border-line bg-surface-2">
      <button
        type="button"
        onClick={() => onChange(clamp(value - step))}
        className="grid h-full w-10 place-items-center rounded-l-xl text-muted transition hover:bg-surface hover:text-ink"
        aria-label="weniger"
      >
        <Icon name="minus" size={17} />
      </button>
      <span className="tnum min-w-14 text-center text-[0.95rem] font-semibold">
        {value}
        {suffix ? <span className="text-muted"> {suffix}</span> : null}
      </span>
      <button
        type="button"
        onClick={() => onChange(clamp(value + step))}
        className="grid h-full w-10 place-items-center rounded-r-xl text-muted transition hover:bg-surface hover:text-ink"
        aria-label="mehr"
      >
        <Icon name="plus" size={17} />
      </button>
    </div>
  );
}

export function EmptyState({
  icon = "people",
  title,
  children,
}: {
  icon?: IconName;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span
        className="grid size-14 place-items-center rounded-2xl"
        style={{
          background: `color-mix(in srgb, ${ACCENT} 12%, transparent)`,
          color: ACCENT,
        }}
      >
        <Icon name={icon} size={26} />
      </span>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {children ? (
        <div className="max-w-sm text-[0.95rem] leading-relaxed text-muted">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-[0.7rem] font-semibold text-muted">
      {children}
    </kbd>
  );
}
