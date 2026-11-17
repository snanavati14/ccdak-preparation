"use client";

import { Button } from "@heroui/react";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { useFocusMode } from "@/lib/focus-mode";
import { cn } from "@/lib/utils";
import { ConfirmModal } from "./kit";
import { SPRING } from "./motion";

/** Above this many steps the stepper becomes a continuous pill with a node at its head. */
const MAX_NODES = 12;

/**
 * Pill stepper: black circular nodes joined by a line. Done steps carry a tick,
 * the current one is a ring, the rest are soft dots. Long sets collapse to a
 * single line with the node riding its head.
 */
export function Stepper({ done, total, label, className }: { done: number; total: number; label: string; className?: string }) {
  const frac = done / Math.max(1, total);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-valuetext={`${done} of ${total}`}
      className={cn("flex min-w-0 items-center", className)}
    >
      {total <= MAX_NODES ? (
        <ol aria-hidden className="flex w-full items-center">
          {Array.from({ length: total }, (_, i) => {
            const state = i < done ? "done" : i === done ? "current" : "todo";
            return (
              <li key={i} className={cn("flex items-center", i > 0 && "flex-1")}>
                {i > 0 && (
                  <span className="relative mx-1 h-0.5 flex-1 overflow-hidden rounded-full bg-line">
                    <motion.span
                      className="absolute inset-0 rounded-full bg-ink"
                      initial={false}
                      animate={{ x: i <= done ? "0%" : "-100%" }}
                      transition={SPRING}
                    />
                  </span>
                )}
                <motion.span
                  initial={false}
                  animate={{ scale: state === "current" ? 1 : state === "done" ? 1 : 0.55 }}
                  transition={SPRING}
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full transition-colors duration-300",
                    state === "done" && "bg-ink text-on-ink",
                    state === "current" && "bg-card shadow-[inset_0_0_0_2.5px_var(--ink)]",
                    state === "todo" && "bg-line-strong",
                  )}
                >
                  {state === "done" && <Check className="size-3.5" strokeWidth={3} />}
                  {state === "current" && <span className="size-2 rounded-full bg-ink" />}
                </motion.span>
              </li>
            );
          })}
        </ol>
      ) : (
        <span aria-hidden className="relative mx-3.5 flex h-7 flex-1 items-center">
          <span className="absolute inset-x-0 h-1 overflow-hidden rounded-full bg-line">
            <motion.span
              className="absolute inset-0 rounded-full bg-ink"
              initial={false}
              animate={{ x: `${(frac - 1) * 100}%` }}
              transition={SPRING}
            />
          </span>
          <motion.span className="absolute inset-0" initial={false} animate={{ x: `${frac * 100}%` }} transition={SPRING}>
            <span className="absolute left-0 top-0 grid size-7 -translate-x-1/2 place-items-center rounded-full bg-ink">
              <span className="size-2 rounded-full bg-on-ink" />
            </span>
          </motion.span>
        </span>
      )}
    </div>
  );
}

/**
 * The pill above a practice or review question: what this session is, how far
 * through it you are, and a guarded way out. It dims with the nav while a
 * question is being answered.
 */
export function SessionBar({
  title,
  done,
  total,
  answered,
  endLabel = "End session",
  onEnd,
}: {
  title: ReactNode;
  done: number;
  total: number;
  answered: number;
  endLabel?: string;
  onEnd: () => void;
}) {
  const focus = useFocusMode();
  const [engaged, setEngaged] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const dim = focus && !engaged;

  return (
    <motion.div
      className="mb-6 grid gap-x-5 gap-y-3 rounded-[28px] bg-card px-5 py-4 sm:grid-cols-[minmax(0,auto)_1fr_auto] sm:items-center sm:rounded-full sm:py-2.5 sm:pl-7 sm:pr-2.5"
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: dim ? 0.4 : 1, y: 0, scale: 1 }}
      transition={dim ? { duration: 0.6 } : SPRING}
      onHoverStart={() => setEngaged(true)}
      onHoverEnd={() => setEngaged(false)}
      onFocusCapture={() => setEngaged(true)}
      onBlurCapture={() => setEngaged(false)}
    >
      <h1 className="min-w-0 truncate text-base font-semibold">{title}</h1>
      <div className="flex min-w-0 items-center gap-3">
        <Stepper done={done} total={total} label="Session progress" className="flex-1" />
        <span className="shrink-0 font-mono text-xs text-muted">
          {done}/{total}
        </span>
      </div>
      <Button variant="tertiary" size="sm" onPress={() => setConfirm(true)} className="justify-self-start sm:justify-self-end">
        {endLabel}
      </Button>
      <ConfirmModal
        open={confirm}
        onOpenChange={setConfirm}
        title={`${endLabel}?`}
        confirmLabel={endLabel}
        cancelLabel="Keep going"
        onConfirm={onEnd}
      >
        {answered === 0
          ? "Nothing has been answered yet."
          : `${answered} ${answered === 1 ? "answer is" : "answers are"} already saved; the rest of the set is dropped.`}
      </ConfirmModal>
    </motion.div>
  );
}
