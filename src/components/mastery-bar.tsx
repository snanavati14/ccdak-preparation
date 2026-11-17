"use client";

import type { CSSProperties } from "react";
import { PillBar } from "./motion";

/**
 * Mastery colour: 0% is highlighter yellow, 100% is light green, and every value
 * between is a mix of the two (both themes define --mastery-0 / --mastery-100).
 */
export function masteryStyle(value: number): CSSProperties {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return { backgroundColor: `color-mix(in oklab, var(--mastery-100) ${pct}%, var(--mastery-0))` };
}

/** The percentage as a coloured pill. Value 0–1. */
export function MasteryPct({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={"inline-flex min-w-[3.25rem] justify-center rounded-full px-2.5 py-0.5 font-mono text-[0.8125rem] text-ink " + (className ?? "")}
      style={masteryStyle(value)}
    >
      {Math.round(value * 100)}%
    </span>
  );
}

/** A rounded bar whose colour runs yellow (0%) to light green (100%). Value 0–1. */
export function MasteryBar({ value, label }: { value: number | null; label?: string }) {
  if (value === null) return <span className="text-xs text-muted">{label ?? "not enough answers"}</span>;
  return (
    <span className="flex items-center gap-3">
      <PillBar value={Math.max(value, 0.03)} className="flex-1" fillStyle={masteryStyle(value)} fillClassName="bg-transparent" />
      <MasteryPct value={value} className="text-xs" />
    </span>
  );
}
