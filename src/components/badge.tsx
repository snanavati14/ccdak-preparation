import { Chip } from "@heroui/react";
import type { Badge as BadgeValue } from "@/lib/content/schema";

const LABEL: Record<BadgeValue, string> = { confirmed: "Confirmed", likely: "Likely", unsure: "Unsure" };
const TITLE: Record<BadgeValue, string> = {
  confirmed: "Confluent's description and several independent prep sources agree this is tested.",
  likely: "Most prep sources include it, but official material doesn't say so explicitly.",
  unsure: "Only some sources mention it, or it may be outdated. Study it last.",
};

/** How sure we are that the exam tests a topic. The form changes with confidence, not only the colour. */
export function Badge({ value }: { value: BadgeValue }) {
  return (
    <Chip
      title={TITLE[value]}
      size="sm"
      className={
        "rounded-full px-2.5 font-medium " +
        (value === "confirmed"
          ? "bg-ink text-on-ink"
          : value === "likely"
            ? "bg-transparent text-ink shadow-[inset_0_0_0_1.5px_var(--line-strong)]"
            : "bg-caution-soft font-semibold text-caution")
      }
    >
      {LABEL[value]}
    </Chip>
  );
}

export const BADGE_EXPLAINED = TITLE;
