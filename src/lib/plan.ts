import type { BankIndex, BankTopic } from "./bank";
import type { Badge, DomainSlug } from "./content/schema";
import { daysUntil } from "./dates";
import type { Progress } from "./storage";
import { DIAGNOSTIC_SIZE } from "./study";

/**
 * Mastery, readiness and the daily plan. All of it is derived from the answer
 * log, so it is only as good as the evidence: topics with fewer than
 * MIN_EVIDENCE answers report no mastery rather than a guess.
 */

export const TARGET = 0.7;
export const MIN_EVIDENCE = 3;
/** Each older answer counts this much less than the one after it. */
const DECAY = 0.8;
const BADGE_FACTOR: Record<Badge, number> = { confirmed: 1, likely: 0.7, unsure: 0.3 };

export type Mastery = { value: number | null; answers: number };

function rolling(results: boolean[]): Mastery {
  // results are newest first
  let num = 0;
  let den = 0;
  results.forEach((ok, k) => {
    const w = DECAY ** k;
    num += ok ? w : 0;
    den += w;
  });
  return { value: results.length >= MIN_EVIDENCE ? num / den : null, answers: results.length };
}

export function masteryByTopic(progress: Progress, bank: BankIndex): Map<string, Mastery> {
  const results = new Map<string, boolean[]>();
  for (let i = progress.log.length - 1; i >= 0; i--) {
    const r = progress.log[i];
    const q = bank.byId.get(r.questionId);
    if (!q) continue;
    for (const t of q.topics) results.set(t, [...(results.get(t) ?? []), r.correct]);
  }
  return new Map(bank.topics.map((t) => [t.slug, rolling(results.get(t.slug) ?? [])]));
}

export function masteryByDomain(progress: Progress, bank: BankIndex): Map<DomainSlug, Mastery> {
  const results = new Map<DomainSlug, boolean[]>();
  for (let i = progress.log.length - 1; i >= 0; i--) {
    const r = progress.log[i];
    const q = bank.byId.get(r.questionId);
    if (q) results.set(q.domain, [...(results.get(q.domain) ?? []), r.correct]);
  }
  return new Map(bank.domains.map((d) => [d.slug, rolling(results.get(d.slug) ?? [])]));
}

/** How much a topic is worth studying now: its share of the section's exam weight times the gap to target. */
function topicPriority(t: BankTopic, m: Mastery, bank: BankIndex): number {
  const domain = bank.domainBySlug.get(t.domain);
  const siblings = bank.topics.filter((x) => x.domain === t.domain).length || 1;
  const share = ((domain?.weight ?? 0) / siblings) * BADGE_FACTOR[t.badge];
  // Unknown mastery is treated as a coin flip, so unseen topics still get picked.
  const gap = Math.max(0, 0.85 - (m.value ?? 0.5));
  return share * gap;
}

export function weakestTopics(progress: Progress, bank: BankIndex, n: number): BankTopic[] {
  const mastery = masteryByTopic(progress, bank);
  return bank.topics
    .filter((t) => bank.questions.some((q) => q.topics.includes(t.slug)))
    .map((t) => ({ t, p: topicPriority(t, mastery.get(t.slug)!, bank) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p)
    .slice(0, n)
    .map((x) => x.t);
}

export type Readiness = { tone: "none" | "ok" | "behind"; line: string };

export function readiness(progress: Progress, bank: BankIndex): Readiness {
  if (progress.log.length === 0) return { tone: "none", line: "No evidence yet." };
  const byDomain = masteryByDomain(progress, bank);
  const seen = bank.domains.filter((d) => byDomain.get(d.slug)?.value !== null);
  const covered = seen.reduce((s, d) => s + d.weight, 0);
  if (covered < 60) {
    const unseen = bank.domains.length - seen.length;
    return { tone: "none", line: `Not enough evidence yet: ${unseen} of ${bank.domains.length} exam sections have under ${MIN_EVIDENCE} answers.` };
  }
  const behind = seen
    .map((d) => ({ d, m: byDomain.get(d.slug)!.value! }))
    .filter((x) => x.m < TARGET)
    .sort((a, b) => b.d.weight * (TARGET - b.m) - a.d.weight * (TARGET - a.m));
  if (behind.length === 0) return { tone: "ok", line: "On track: every exam section with evidence is at or above 70%." };
  const names = behind.slice(0, 2).map((x) => `${x.d.title} (${Math.round(x.m * 100)}%)`);
  return { tone: "behind", line: `Behind on ${names.join(" and ")}.` };
}

export type QueueItem =
  | { kind: "diagnostic"; size: number; answered: number; href: string }
  | { kind: "review"; size: number; href: string }
  | { kind: "drill"; size: number; topics: BankTopic[]; href: string }
  | { kind: "exam"; href: string; reason: string };

export function startOfDay(now = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export function answeredToday(progress: Progress, now = new Date()): number {
  const start = startOfDay(now);
  let n = 0;
  for (let i = progress.log.length - 1; i >= 0 && progress.log[i].at >= start; i--) n++;
  return n;
}

export function dueCards(progress: Progress, now = Date.now()): string[] {
  return Object.entries(progress.cards)
    .filter(([, c]) => c.due <= now)
    .sort(([, a], [, b]) => a.due - b.due)
    .map(([id]) => id);
}

/** Today's queue, in the order the learner should do it. */
export function todayQueue(progress: Progress, bank: BankIndex, now = new Date()): QueueItem[] {
  if (!progress.diagnosticDone) {
    const answered = progress.log.filter((r) => r.mode === "diagnostic").length;
    return [{ kind: "diagnostic", size: DIAGNOSTIC_SIZE, answered, href: "/practice/?mode=diagnostic" }];
  }
  const items: QueueItem[] = [];
  const due = dueCards(progress, now.getTime()).filter((id) => bank.byId.has(id));
  if (due.length) items.push({ kind: "review", size: Math.min(due.length, 40), href: "/review/" });

  const left = Math.max(0, progress.settings.dailyGoal - answeredToday(progress, now) - due.length);
  if (left > 0) {
    const topics = weakestTopics(progress, bank, 3);
    const size = left <= 10 ? 10 : left <= 20 ? 20 : 30;
    if (topics.length) {
      items.push({ kind: "drill", size, topics, href: `/practice/?topics=${topics.map((t) => t.slug).join(",")}&size=${size}` });
    }
  }

  const days = daysUntil(progress.settings.examDate, now);
  const lastExam = progress.exams.at(-1)?.finishedAt ?? 0;
  const daysSinceExam = (now.getTime() - lastExam) / 86_400_000;
  if (progress.activeExam) {
    items.unshift({ kind: "exam", href: "/exam/", reason: "A mock exam is in progress." });
  } else if (days >= 0 && days <= 14 && daysSinceExam >= 4) {
    items.push({
      kind: "exam",
      href: "/exam/",
      reason: progress.exams.length ? "Last mock was over 4 days ago." : "Two weeks out: time for a first full mock.",
    });
  }
  return items;
}

/** Questions left before the exam at the daily goal, for the pace line. */
export function pace(progress: Progress, now = new Date()) {
  const days = Math.max(0, daysUntil(progress.settings.examDate, now));
  return { days, total: days * progress.settings.dailyGoal, today: answeredToday(progress, now) };
}
