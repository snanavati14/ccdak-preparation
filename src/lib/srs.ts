import type { Card } from "./storage";

/**
 * SM-2 spaced repetition, lightly simplified. Grades are coarse because the
 * app only knows right or wrong (and how slow the answer was):
 *   5 right and quick, 4 right, 2 wrong (lapse).
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_EASE = 1.3;

export type Grade = 2 | 4 | 5;

export function newCard(now: number): Card {
  return { ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now };
}

export function schedule(card: Card, grade: Grade, now: number): Card {
  const ease = Math.max(MIN_EASE, card.ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
  if (grade < 3) {
    // A miss restarts the ladder: see it again tomorrow.
    return { ease, interval: 1, reps: 0, lapses: card.lapses + 1, due: now + DAY_MS };
  }
  const reps = card.reps + 1;
  const interval = reps === 1 ? 1 : reps === 2 ? 3 : Math.round(card.interval * ease);
  return { ease, interval, reps, lapses: card.lapses, due: now + interval * DAY_MS };
}

/** Grade from correctness and time taken; slow right answers count as shakier. */
export function gradeFor(correct: boolean, ms: number | undefined): Grade {
  if (!correct) return 2;
  return ms !== undefined && ms < 30_000 ? 5 : 4;
}

/** A card has graduated once it has been right several times in a row with a long gap. */
export function isLearned(card: Card): boolean {
  return card.reps >= 3 && card.interval >= 14;
}
