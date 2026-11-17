"use client";

import { Button, buttonVariants, Kbd, Modal, Radio, RadioGroup } from "@heroui/react";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal, SNAPPY } from "./motion";

type Variant = "primary" | "secondary" | "tertiary" | "ghost" | "outline" | "danger";

/** A Next link styled as a HeroUI pill button. */
export function LinkButton({
  variant = "primary",
  size = "md",
  arrow = false,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: "sm" | "md" | "lg"; arrow?: boolean }) {
  return (
    <Link className={cn(buttonVariants({ variant, size }), "group no-underline", className)} {...props}>
      {children}
      {arrow && (
        <ArrowRight
          aria-hidden
          className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-0.5"
          strokeWidth={2.4}
        />
      )}
    </Link>
  );
}

/** A keyboard key as a small pill. */
export function Key({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Kbd className={cn("align-middle", className)}>
      <Kbd.Content>{children}</Kbd.Content>
    </Kbd>
  );
}

/** Page title and lead, rising in. */
export function PageHeader({ title, lead, children }: { title: ReactNode; lead?: ReactNode; children?: ReactNode }) {
  return (
    <Reveal className="mb-8 sm:mb-10">
      <h1 className="text-3xl font-semibold tracking-[-0.035em]">{title}</h1>
      {lead && <div className="mt-4 max-w-[62ch] text-lg text-muted">{lead}</div>}
      {children}
    </Reveal>
  );
}

/** Small label above a group. */
export function Eyebrow({ children, id, className }: { children: ReactNode; id?: string; className?: string }) {
  return (
    <h2 id={id} className={cn("text-sm font-semibold text-muted", className)}>
      {children}
    </h2>
  );
}

/** The white surface every group sits on. */
export const cardClass = "rounded-[28px] bg-card p-6 sm:p-8";
/** A soft inner panel inside a card. */
export const panelClass = "rounded-[20px] bg-panel";

/**
 * A segmented pill control on HeroUI's RadioGroup: the selected option carries a
 * black pill that glides between options (shared layout).
 */
export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
  mono = false,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
  mono?: boolean;
}) {
  const layout = useId();
  return (
    <RadioGroup
      aria-label={label}
      value={value}
      onChange={(v) => onChange(v as T)}
      orientation="horizontal"
      className={cn("inline-flex flex-row flex-wrap gap-1 rounded-full bg-panel p-1", className)}
    >
      {options.map((o) => (
        <Radio key={o.value} value={o.value} className="block">
          <Radio.Content
            className={({ isSelected }) =>
              cn(
                "relative isolate flex min-h-11 cursor-pointer items-center justify-center gap-0 rounded-full px-5 text-[0.9375rem] font-semibold transition-colors duration-200 data-[focus-visible=true]:outline-2 data-[focus-visible=true]:outline-offset-2 data-[focus-visible=true]:outline-[var(--focus-ring)]",
                isSelected ? "text-on-ink" : "text-muted hover:text-ink",
                mono && "font-mono font-medium",
              )
            }
          >
            {({ isSelected }) => (
              <>
                {isSelected && (
                  <motion.span layoutId={layout} transition={SNAPPY} className="absolute inset-0 -z-10 rounded-full bg-ink" />
                )}
                {o.label}
              </>
            )}
          </Radio.Content>
        </Radio>
      ))}
    </RadioGroup>
  );
}

/**
 * A HeroUI modal for a guarded action: Esc and the backdrop cancel, focus starts on
 * the safe choice and returns to the opener when it closes.
 */
export function ConfirmModal({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel,
  cancelLabel,
  onConfirm,
  danger = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  danger?: boolean;
}) {
  return (
    <Modal.Backdrop isOpen={open} onOpenChange={onOpenChange} isDismissable>
      <Modal.Container size="md" placement="center">
        <Modal.Dialog className="p-7 sm:p-8">
          <Modal.Header>
            <Modal.Heading className="text-2xl font-semibold tracking-[-0.02em] text-ink">{title}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="text-base text-muted">{children}</Modal.Body>
          <Modal.Footer className="flex-wrap">
            <Button variant="tertiary" autoFocus onPress={() => onOpenChange(false)}>
              {cancelLabel}
            </Button>
            <Button
              variant={danger ? "danger" : "primary"}
              onPress={() => {
                onOpenChange(false);
                onConfirm();
              }}
            >
              {confirmLabel}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
