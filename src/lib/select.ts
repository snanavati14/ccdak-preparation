import type { BankIndex } from "./bank";
import type { Question } from "./content/schema";
import type { Progress } from "./storage";

/** Choosing which questions a session asks. */

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Unseen first, then the ones seen longest ago; random within each tier. */
function freshestFirst(pool: Question[], progress: Progress): Question[] {
  const lastSeen = new Map<string, number>();
  for (const r of progress.log) lastSeen.set(r.questionId, r.at);
  const unseen = shuffle(pool.filter((q) => !lastSeen.has(q.id)));
  const seen = shuffle(pool.filter((q) => lastSeen.has(q.id))).sort((a, b) => lastSeen.get(a.id)! - lastSeen.get(b.id)!);
  return [...unseen, ...seen];
}

export function pickPractice(bank: BankIndex, progress: Progress, size: number, topics: string[] = []): Question[] {
  const pool = topics.length ? bank.questions.filter((q) => q.topics.some((t) => topics.includes(t))) : bank.questions;
  return freshestFirst(pool, progress).slice(0, size);
}

/** Spread a session across the exam sections in proportion to the published exam weights. */
function stratified(bank: BankIndex, progress: Progress, size: number, filter: (q: Question) => boolean): Question[] {
  const domains = bank.domains.filter((d) => bank.questions.some((q) => q.domain === d.slug && filter(q)));
  const totalWeight = domains.reduce((s, d) => s + d.weight, 0) || 1;
  const quota = new Map(domains.map((d) => [d.slug, Math.max(1, Math.round((d.weight / totalWeight) * size))]));
  const picked: Question[] = [];
  for (const d of domains) {
    const pool = freshestFirst(bank.questions.filter((q) => q.domain === d.slug && filter(q)), progress);
    picked.push(...pool.slice(0, quota.get(d.slug)));
  }
  // Rounding can leave us short or over; top up from anything not yet picked, or trim.
  const ids = new Set(picked.map((q) => q.id));
  const rest = freshestFirst(bank.questions.filter((q) => !ids.has(q.id) && filter(q)), progress);
  return shuffle([...picked, ...rest].slice(0, size));
}

/** 30 questions across every exam section, avoiding the shakiest and hardest items. */
export function pickDiagnostic(bank: BankIndex, progress: Progress, size: number): Question[] {
  const answered = new Set(progress.log.filter((r) => r.mode === "diagnostic").map((r) => r.questionId));
  return stratified(bank, progress, size, (q) => q.confidence !== "unsure" && q.difficulty <= 2 && !answered.has(q.id));
}

/** Mixed practice: weighted like the exam, not like the bank (which is heavy on application development). */
export function pickMixed(bank: BankIndex, progress: Progress, size: number): Question[] {
  return stratified(bank, progress, size, () => true);
}

export function pickExam(bank: BankIndex, progress: Progress, size: number): Question[] {
  return stratified(bank, progress, size, () => true);
}
