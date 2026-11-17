import type { CSSProperties } from "react";
import type { DomainSlug } from "@/lib/content/schema";

/**
 * Each exam section owns one highlighter, in the guide's fixed order:
 * fundamentals yellow, app development orange, streams pink, connect lilac,
 * testing mint, observability sky. `hl` sits under text; `chip` never does.
 */
export const sectionHl = (d: DomainSlug) => `var(--hl-${d})`;
export const sectionChip = (d: DomainSlug) => `var(--chip-${d})`;

export const chipStyle = (d: DomainSlug): CSSProperties => ({ background: sectionChip(d) });
export const hlStyle = (d: DomainSlug): CSSProperties => ({ "--hl-color": sectionHl(d) }) as CSSProperties;
