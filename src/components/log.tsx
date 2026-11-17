"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { formatOffset } from "@/lib/dates";
import { SPRING } from "./motion";

/**
 * Answer lists: a mark and the answer's offset in a narrow mono gutter, the
 * question beside it, each row a soft rounded panel that rises in.
 */

export function LogList({ children, label }: { children: ReactNode; label: string }) {
  return (
    <motion.ol
      aria-label={label}
      className="grid gap-1.5"
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.035 } } }}
    >
      {children}
    </motion.ol>
  );
}

export function LogRow({
  offset,
  offsetLabel,
  mark,
  pending = false,
  children,
  aside,
}: {
  offset?: number;
  /** Use for ranges such as "0000–0029". */
  offsetLabel?: string;
  /** A tick or cross, drawn in the gutter. */
  mark?: ReactNode;
  pending?: boolean;
  children: ReactNode;
  aside?: ReactNode;
}) {
  const label = offsetLabel ?? (offset !== undefined ? formatOffset(offset) : "");
  return (
    <motion.li
      variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: SPRING } }}
      className="grid grid-cols-[1.5rem_1fr] items-center gap-x-3 rounded-[20px] bg-panel px-4 py-3 sm:grid-cols-[1.5rem_3.5rem_1fr_auto]"
    >
      <span className="grid place-items-center">{mark}</span>
      <span className={"hidden font-mono text-[0.6875rem] sm:block " + (pending ? "text-muted" : "text-ink")}>{label}</span>
      <div className="min-w-0">{children}</div>
      {aside && <div className="col-start-2 text-sm text-muted sm:col-start-4">{aside}</div>}
    </motion.li>
  );
}

/** Where the marking stops: everything above is answered. */
export function CommitMarker({ offset }: { offset: number | null }) {
  return (
    <div
      className="mt-3 flex items-center gap-3 text-xs text-muted"
      role="separator"
      aria-label={offset === null ? "Nothing answered yet" : `Answered through offset ${formatOffset(offset)}`}
    >
      <span className="rounded-full bg-panel px-3 py-1">
        {offset === null ? "Nothing yet" : <>Marked through <span className="font-mono text-ink">{formatOffset(offset)}</span></>}
      </span>
      <span aria-hidden className="h-px flex-1 rounded-full bg-line" />
    </div>
  );
}
