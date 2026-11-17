"use client";

import { AnimatePresence, motion, type HTMLMotionProps, type Transition, type Variants } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** The one spring: confident, settles fast, no wobble. */
export const SPRING: Transition = { type: "spring", stiffness: 260, damping: 26, mass: 0.9 };
export const SNAPPY: Transition = { type: "spring", stiffness: 420, damping: 34 };
export const EASE = [0.22, 1, 0.36, 1] as const;

const rise: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: SPRING },
};

const TAGS = {
  div: motion.div,
  section: motion.section,
  aside: motion.aside,
  ul: motion.ul,
  ol: motion.ol,
  li: motion.li,
  article: motion.article,
  p: motion.p,
  span: motion.span,
  dl: motion.dl,
} as const;
type Tag = keyof typeof TAGS;

type Props = Omit<HTMLMotionProps<"div">, "children"> & {
  as?: Tag;
  children?: ReactNode;
  className?: string;
};

/** Fades and rises one block in: opacity, 12px, 0.98 → 1. */
export function Reveal({ as = "div", delay = 0, className, children, ...rest }: Props & { delay?: number }) {
  const C = TAGS[as] as typeof motion.div;
  return (
    <C
      initial="hidden"
      animate="show"
      variants={{ hidden: rise.hidden, show: { ...rise.show, transition: { ...SPRING, delay } } }}
      className={className}
      {...rest}
    >
      {children}
    </C>
  );
}

/** A container whose StaggerItem children arrive 50ms apart. */
export function Stagger({
  as = "div",
  className,
  children,
  delay = 0,
  step = 0.05,
  ...rest
}: Props & { delay?: number; step?: number }) {
  const C = TAGS[as] as typeof motion.div;
  return (
    <C
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: step, delayChildren: delay } } }}
      className={className}
      {...rest}
    >
      {children}
    </C>
  );
}

export function StaggerItem({ as = "div", className, children, ...rest }: Props) {
  const C = TAGS[as] as typeof motion.div;
  return (
    <C variants={rise} className={className} {...rest}>
      {children}
    </C>
  );
}

/** A card-sized block that lifts 2px on hover. */
export function Lift({ as = "div", className, children, ...rest }: Props) {
  const C = TAGS[as] as typeof motion.div;
  return (
    <C variants={rise} whileHover={{ y: -2 }} transition={SPRING} className={className} {...rest}>
      {children}
    </C>
  );
}

/** Opens and closes its content with a height spring and a fade. */
export function Collapse({ open, children, className, id }: { open: boolean; children: ReactNode; className?: string; id?: string }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          id={id}
          key="c"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ height: SPRING, opacity: { duration: 0.2 } }}
          className={cn("overflow-hidden", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** A pill progress bar: a full-width rounded fill slid in with transform, so its cap stays round. Value 0–1. */
export function PillBar({
  value,
  className,
  fillClassName,
  fillStyle,
}: {
  value: number;
  className?: string;
  fillClassName?: string;
  fillStyle?: React.CSSProperties;
}) {
  const v = Math.min(1, Math.max(0, value));
  return (
    <span aria-hidden className={cn("relative block h-2.5 overflow-hidden rounded-full bg-panel", className)}>
      <motion.span
        className={cn("absolute inset-0 rounded-full bg-ink", fillClassName)}
        style={fillStyle}
        initial={{ x: "-100%" }}
        animate={{ x: `${(v - 1) * 100}%` }}
        transition={SPRING}
      />
    </span>
  );
}
