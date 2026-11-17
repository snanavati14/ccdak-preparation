const DAY_MS = 24 * 60 * 60 * 1000;

/** Parse YYYY-MM-DD as a local calendar date (not UTC midnight). */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Whole calendar days from today until the date; 0 on the day itself, negative after. */
export function daysUntil(iso: string, now = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((parseLocalDate(iso).getTime() - today.getTime()) / DAY_MS);
}

export function formatShortDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatLongDate(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Offsets render as fixed-width numbers, like a partition's log. */
export function formatOffset(n: number): string {
  return String(n).padStart(4, "0");
}
