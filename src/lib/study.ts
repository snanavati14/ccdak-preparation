import type { Question } from "./content/schema";
import { gradeFor, newCard, schedule } from "./srs";
import { updateProgress, type AnswerRecord, type Progress } from "./storage";

/** Writes that turn an answer into log records, card schedules and flags. */

export const DIAGNOSTIC_SIZE = 30;

export function isCorrect(q: Question, chosen: string[]): boolean {
  return chosen.length === q.correct.length && q.correct.every((c) => chosen.includes(c));
}

function applyAnswer(p: Progress, q: Question, chosen: string[], mode: AnswerRecord["mode"], ms: number | undefined, now: number): Progress {
  const correct = isCorrect(q, chosen);
  const record: AnswerRecord = { offset: p.log.length, questionId: q.id, at: now, correct, chosen, ms, mode };
  const card = p.cards[q.id];
  const cards = { ...p.cards };
  // Misses always enter review; right answers only move cards that already exist.
  if (!correct || card) cards[q.id] = schedule(card ?? newCard(now), gradeFor(correct, ms), now);
  const log = [...p.log, record];
  const diagnosticDone = p.diagnosticDone || log.filter((r) => r.mode === "diagnostic").length >= DIAGNOSTIC_SIZE;
  return { ...p, log, cards, diagnosticDone };
}

/** Append one answer to the log and reschedule its card. Returns the new record. */
export function recordAnswer(q: Question, chosen: string[], mode: AnswerRecord["mode"], ms?: number): AnswerRecord {
  const now = Date.now();
  const next = updateProgress((p) => applyAnswer(p, q, chosen, mode, ms, now));
  return next.log[next.log.length - 1];
}

/** Record many answers in one write (mock exam submit). */
export function recordAnswers(items: { q: Question; chosen: string[]; ms?: number }[], mode: AnswerRecord["mode"]) {
  const now = Date.now();
  updateProgress((p) => items.reduce((acc, it) => applyAnswer(acc, it.q, it.chosen, mode, it.ms, now), p));
}

/** Flag or unflag a question. Flagging puts it in the review queue straight away. */
export function toggleFlag(id: string) {
  updateProgress((p) => {
    if (p.flags.includes(id)) return { ...p, flags: p.flags.filter((f) => f !== id) };
    const now = Date.now();
    const card = p.cards[id] ? { ...p.cards[id], due: Math.min(p.cards[id].due, now) } : newCard(now);
    return { ...p, flags: [...p.flags, id], cards: { ...p.cards, [id]: card } };
  });
}

/** Mark the diagnostic as finished early (for example after skipping). */
export function finishDiagnostic() {
  updateProgress((p) => ({ ...p, diagnosticDone: true }));
}
