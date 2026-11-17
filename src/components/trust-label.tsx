import { Chip } from "@heroui/react";
import type { Resource } from "@/lib/content/schema";

const LABEL: Record<Resource["trust"], string> = {
  official: "Official",
  high: "High trust",
  community: "Community",
  caution: "Caution",
};

export function TrustLabel({ trust }: { trust: Resource["trust"] }) {
  return (
    <Chip
      size="sm"
      className={
        "whitespace-nowrap rounded-full px-2.5 " +
        (trust === "caution"
          ? "bg-caution-soft font-semibold text-caution"
          : trust === "official"
            ? "bg-ink text-on-ink"
            : trust === "high"
              ? "bg-[var(--hl-testing)] text-ink"
              : "bg-panel text-muted")
      }
    >
      {LABEL[trust]}
    </Chip>
  );
}
