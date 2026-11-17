import type { DomainSlug } from "@/lib/content/schema";
import { cn } from "@/lib/utils";
import { chipStyle } from "./sections";

/**
 * Hand-drawn marks. Answers get pen ticks and crosses (green and red, but the
 * shape carries the meaning too); mastery gets a lighter pencil tick.
 */

type MarkProps = { className?: string; title?: string };

function Svg({ className, title, children }: MarkProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn("inline-block size-[1.1em] shrink-0", className)}
    >
      {children}
    </svg>
  );
}

export const TICK_PATH = "M3.5 13.2c1.6 1.2 3.1 2.9 4.6 5.3C10.9 12.1 15 7 20.8 3.6";
export const CROSS_PATHS = ["M5 4.6c4.6 4.4 9.3 9.6 14.4 15", "M19.2 4.2C14 8.6 9.4 13.6 4.6 19.6"];

export function PenTick({ className, title }: MarkProps) {
  return (
    <Svg className={cn("text-correct", className)} title={title}>
      <path d={TICK_PATH} stroke="currentColor" strokeWidth={2.8} />
    </Svg>
  );
}

export function PenCross({ className, title }: MarkProps) {
  return (
    <Svg className={cn("text-wrong", className)} title={title}>
      {CROSS_PATHS.map((d) => (
        <path key={d} d={d} stroke="currentColor" strokeWidth={2.8} />
      ))}
    </Svg>
  );
}

export function PencilTick({ className, title }: MarkProps) {
  return (
    <Svg className={cn("text-muted", className)} title={title}>
      <path d={TICK_PATH} stroke="currentColor" strokeWidth={1.6} />
    </Svg>
  );
}

/** The section's pen colour as a small round dot. */
export function SectionChip({ domain, className }: { domain: DomainSlug; className?: string }) {
  return <i aria-hidden className={cn("inline-block size-2.5 shrink-0 rounded-full", className)} style={chipStyle(domain)} />;
}

/** A run of pen marks for recent answers, read as "8 of 10 right". */
export function MarkRun({ results, className }: { results: boolean[]; className?: string }) {
  const right = results.filter(Boolean).length;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-0.5", className)} role="img" aria-label={`${right} of ${results.length} right`}>
      {results.map((ok, i) => (ok ? <PenTick key={i} /> : <PenCross key={i} />))}
    </span>
  );
}
