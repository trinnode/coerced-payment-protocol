import { cn } from "@/lib/utils";

const SHIELD_TOP = "M24 3C30 6 36.5 8 42 10V19";
const SHIELD_BOTTOM = "M42 25C42 34 34 41 24 45C14 41 6 34 6 24V10C11.5 8 18 6 24 3";
const STEM = "M18.5 33V16.5h6.8c4.1 0 6.4 2.3 6.4 5.4 0 3.1-2.3 5.5-6.4 5.5";
const SIGNAL = "M31.5 22H46";

/**
 * The Phylax brand mark: a shield broken at bowl height, with an interior stem
 * and open bowl. The guard-green geometry stops; an amber signal crosses the
 * gap and leaves. Protection without concealment, in one glyph.
 * `currentColor` drives the shield so it works on any surface.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("h-7 w-7 shrink-0 text-guard", className)}
    >
      <g
        stroke="currentColor"
        strokeWidth={3.2}
        strokeLinejoin="round"
        strokeLinecap="round"
      >
        <path d={SHIELD_TOP} />
        <path d={SHIELD_BOTTOM} />
        <path d={STEM} />
      </g>
      <path
        d={SIGNAL}
        stroke="var(--color-signal, #efb45c)"
        strokeWidth={4.2}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Mark className={compact ? "h-6 w-6" : "h-7 w-7"} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.35rem] tracking-[-0.02em] text-ink">Phylax</span>
        {!compact && <span className="mono-label mt-1">design record</span>}
      </span>
    </span>
  );
}
