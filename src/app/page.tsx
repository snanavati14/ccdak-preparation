"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type CSSProperties } from "react";
import { BankGate } from "@/components/bank-gate";
import { Eyebrow, Key, LinkButton } from "@/components/kit";
import { MasteryPct } from "@/components/mastery-bar";
import { MarkRun, PencilTick, SectionChip } from "@/components/marks";
import { Lift, PillBar, Reveal, Stagger, StaggerItem } from "@/components/motion";
import { sectionChip, sectionHl } from "@/components/sections";
import { NumberTicker } from "@/components/ui/number-ticker";
import type { BankIndex } from "@/lib/bank";
import { DOMAIN_SLUGS, type DomainSlug } from "@/lib/content/schema";
import { daysUntil, formatShortDate } from "@/lib/dates";
import { dueCards, masteryByTopic, pace, readiness, TARGET, todayQueue, type QueueItem } from "@/lib/plan";
import { DEFAULT_EXAM_DATE, type Progress } from "@/lib/storage";
import { useHydrated, useProgress } from "@/lib/use-progress";
import { cn } from "@/lib/utils";

/** At or above this rolling accuracy a topic gets the pencil tick. */
const MASTERED = 0.85;
/** How far back the headline accuracy looks. */
const RECENT = 120;

/** Roughly 90 seconds a question: the real exam's pace. */
const minutes = (n: number) => `about ${Math.max(5, Math.round((n * 1.5) / 5) * 5)} min`;

const ALL_SECTIONS: CSSProperties = {
  background: `linear-gradient(${DOMAIN_SLUGS.map((d, i) => `${sectionChip(d)} ${(i / 6) * 100}% ${((i + 1) / 6) * 100}%`).join(", ")})`,
};

function itemCopy(item: QueueItem): {
  title: string;
  detail: string;
  aside: string;
  action: string;
  short: string;
  due?: boolean;
  size?: number;
  tab: CSSProperties;
} {
  switch (item.kind) {
    case "diagnostic": {
      const left = item.size - item.answered;
      return {
        title: item.answered ? `Diagnostic, continued · ${left} to go` : `Diagnostic · ${item.size} questions`,
        detail: item.answered
          ? `${item.answered} of ${item.size} answered. Mixed questions from all six exam sections.`
          : "Mixed questions from all six exam sections, to find the real weak spots.",
        aside: minutes(left),
        action: item.answered ? "Resume" : "Start",
        short: item.answered ? "Resume" : "Start",
        size: left,
        tab: ALL_SECTIONS,
      };
    }
    case "review":
      return {
        title: `Review · ${item.size} due`,
        detail: "Missed or flagged answers whose interval is up",
        aside: minutes(item.size),
        action: "Start",
        short: "Review",
        due: true,
        size: item.size,
        tab: { background: "var(--ink)" },
      };
    case "drill":
      return {
        title: `Practice ${item.size} · weakest first`,
        detail: item.topics.map((t) => t.title).join(", "),
        aside: minutes(item.size),
        action: "Start",
        short: "Drill",
        size: item.size,
        tab: { background: sectionChip(item.topics[0]?.domain ?? "fundamentals") },
      };
    case "exam":
      return {
        title: "Mock exam · 60 questions, 90 min",
        detail: item.reason,
        aside: "weighted by the six exam sections",
        action: "Open",
        short: "Sit it",
        size: 60,
        tab: ALL_SECTIONS,
      };
  }
}

function staticCountdown(days: number, examDate: string) {
  if (days > 1) return `${days} days to ${formatShortDate(examDate)}.`;
  if (days === 1) return `Exam tomorrow, ${formatShortDate(examDate)}.`;
  if (days === 0) return "Exam day.";
  return `Exam date passed (${formatShortDate(examDate)}).`;
}

/** Before hydration: the saved exam date and today's date, written in before first paint. */
const countdownScript = `try{var e=document.getElementById("countdown-static"),d=(JSON.parse(localStorage.getItem("offset:progress")||"{}").settings||{}).examDate||"${DEFAULT_EXAM_DATE}",p=d.split("-").map(Number),x=new Date(p[0],p[1]-1,p[2]),n=new Date(),t=new Date(n.getFullYear(),n.getMonth(),n.getDate()),k=Math.round((x-t)/864e5),s=x.toLocaleDateString("en-GB",{day:"numeric",month:"short"});e.textContent=k>1?k+" days to "+s+".":k===1?"Exam tomorrow, "+s+".":k===0?"Exam day.":"Exam date passed ("+s+")."}catch(_){}`;

function Countdown({ days, examDate }: { days: number; examDate: string }) {
  const swipe = (children: React.ReactNode) => (
    <Reveal as="span" delay={0.1} className="inline-block rounded-full bg-[var(--hl-fundamentals)] px-[0.3em]">
      {children}
    </Reveal>
  );
  if (days > 1)
    return (
      <>
        {swipe(
          <>
            <NumberTicker value={days} startValue={0} className="text-right" style={{ minWidth: `${String(days).length * 0.62}em` }} /> days
          </>,
        )}{" "}
        to {formatShortDate(examDate)}.
      </>
    );
  if (days === 1) return <>Exam {swipe("tomorrow")}, {formatShortDate(examDate)}.</>;
  if (days === 0) return <>{swipe("Exam day.")}</>;
  return <>Exam date passed ({formatShortDate(examDate)}).</>;
}

export default function TodayPage() {
  const hydrated = useHydrated();
  const progress = useProgress();
  const { examDate } = progress.settings;
  const days = daysUntil(examDate);

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,27rem)]">
      <section aria-labelledby="today-heading" className="min-w-0">
        <h1
          id="today-heading"
          className="px-1 pb-2 text-display font-semibold tracking-[-0.045em] [font-variant-numeric:tabular-nums]"
        >
          {hydrated ? (
            <Countdown days={days} examDate={examDate} />
          ) : (
            <>
              <span id="countdown-static" suppressHydrationWarning>
                {staticCountdown(days, examDate)}
              </span>
              <script dangerouslySetInnerHTML={{ __html: countdownScript }} />
            </>
          )}
        </h1>
        <BankGate>{(bank) => <Plan bank={bank} />}</BankGate>
      </section>
      <BankGate>{(bank) => <WeakSpots bank={bank} />}</BankGate>
    </div>
  );
}

function recentAccuracy(progress: Progress) {
  const recent = progress.log.slice(-RECENT);
  const right = recent.filter((r) => r.correct).length;
  return { n: recent.length, pct: recent.length ? Math.round((right / recent.length) * 100) : 0 };
}

function Stat({ label, children, foot }: { label: string; children: React.ReactNode; foot?: React.ReactNode }) {
  return (
    <StaggerItem className="rounded-[20px] bg-panel px-5 py-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-mono text-2xl font-medium tracking-[-0.03em]">{children}</p>
      {foot}
    </StaggerItem>
  );
}

function Plan({ bank }: { bank: BankIndex }) {
  const router = useRouter();
  const progress = useProgress();
  const queue = todayQueue(progress, bank);
  const ready = readiness(progress, bank);
  const p = pace(progress);
  const first = queue[0];
  const acc = recentAccuracy(progress);
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  const goal = progress.settings.dailyGoal;

  // Enter starts the first queued item when nothing else has focus.
  useEffect(() => {
    if (!first) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.activeElement && document.activeElement !== document.body) return;
      e.preventDefault();
      router.push(first.href);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [first, router]);

  return (
    <Stagger className="mt-6 grid gap-5" delay={0.05}>
      <StaggerItem className="rounded-[28px] bg-card p-6 sm:p-8">
        <p className="max-w-[44rem] text-lg leading-relaxed sm:text-xl">
          <span className="text-muted">{today}. </span>
          {progress.log.length === 0 ? (
            "No evidence yet. A 30-question diagnostic across every exam section seeds your mastery per topic, and the plan is built from what it finds."
          ) : (
            <>
              You are at <strong className="font-semibold">{acc.pct}%</strong> over your last {acc.n}{" "}
              {acc.n === 1 ? "answer" : "answers"}. Your bar is <span className="mark-bar">{Math.round(TARGET * 100)}%</span>.{" "}
              {!progress.diagnosticDone
                ? "Finish the diagnostic first: the plan needs evidence from every exam section."
                : ready.line}
            </>
          )}
        </p>
        <Stagger className="mt-6 grid gap-2 sm:grid-cols-3" delay={0.15}>
          <Stat label="Recent accuracy">
            <NumberTicker value={acc.pct} />%
          </Stat>
          <Stat label="Today" foot={<PillBar value={p.today / Math.max(1, goal)} className="mt-3 h-2" />}>
            {p.today}
            <span className="text-base text-muted">/{goal}</span>
          </Stat>
          <Stat label="Before the exam">~{p.total}</Stat>
        </Stagger>
        <p className="mt-4 text-sm">
          <Link href="/settings/" className="text-muted">
            Change date or goal
          </Link>
        </p>
      </StaggerItem>

      <StaggerItem as="section" aria-labelledby="queue-heading" className="rounded-[28px] bg-card p-4 sm:p-6">
        <Eyebrow id="queue-heading" className="px-2 pb-3 pt-1">
          Next up
        </Eyebrow>
        {queue.length === 0 ? (
          <div className="rounded-[20px] bg-panel p-5">
            <p className="max-w-[60ch]">Today&apos;s goal is met and nothing is due. Practise more if you like, or stop here.</p>
            <LinkButton href="/practice/" variant="secondary" className="mt-4">
              Practise more
            </LinkButton>
          </div>
        ) : (
          <>
            <Stagger as="ol" aria-labelledby="queue-heading" className="grid gap-2" delay={0.2} step={0.06}>
              {queue.map((item, i) => {
                const c = itemCopy(item);
                return (
                  <Lift
                    as="li"
                    key={item.kind}
                    className={cn(
                      "grid grid-cols-[0.75rem_1fr] items-center gap-x-4 gap-y-3 rounded-[20px] px-4 py-4 sm:grid-cols-[0.75rem_1fr_auto] sm:gap-x-5 sm:px-5",
                      i === 0 ? "bg-panel" : "bg-panel/50",
                    )}
                  >
                    <i aria-hidden className="h-12 w-3 self-center rounded-full" style={c.tab} />
                    <div className="min-w-0">
                      <p className={cn("text-lg font-semibold leading-snug sm:text-xl", c.due && "mark-due")}>{c.title}</p>
                      <p className="mt-0.5 text-[0.9375rem] text-muted">
                        {c.detail} <span className="whitespace-nowrap font-mono text-xs">· {c.aside}</span>
                      </p>
                    </div>
                    <div className="col-start-2 sm:col-start-3">
                      <LinkButton href={item.href} variant={i === 0 ? "primary" : "tertiary"} size={i === 0 ? "lg" : "md"} arrow>
                        {i === 0 ? c.action : c.short}
                        <span className="sr-only">: {c.title}</span>
                      </LinkButton>
                    </div>
                  </Lift>
                );
              })}
            </Stagger>
            <p className="mt-4 hidden px-2 text-sm text-muted sm:block">
              <Key>Enter</Key> starts the first item
            </p>
          </>
        )}
      </StaggerItem>
    </Stagger>
  );
}

function WeakSpots({ bank }: { bank: BankIndex }) {
  const progress = useProgress();
  const mastery = masteryByTopic(progress, bank);
  const dueTopics = new Set(
    dueCards(progress)
      .map((id) => bank.byId.get(id))
      .flatMap((q) => q?.topics ?? []),
  );
  const anyEvidence = [...mastery.values()].some((m) => m.value !== null);
  const last = progress.log.slice(-10);

  return (
    <Reveal as="aside" delay={0.12} aria-labelledby="weak-heading" className="min-w-0 rounded-[28px] bg-card p-6 sm:p-7 lg:sticky lg:top-[calc(var(--nav-h)+1rem)]">
      <Eyebrow id="weak-heading">Weak spots, highlighted</Eyebrow>

      {!anyEvidence ? (
        <>
          <p className="mt-3 max-w-[48ch] text-[0.9375rem]">
            Nothing highlighted yet. Answers decide what gets marked: each exam section has its own colour, and a topic
            lights up once you miss enough of it.
          </p>
          <Stagger as="ul" className="mt-5 grid gap-1.5" delay={0.2} step={0.04}>
            {bank.domains.map((d) => (
              <StaggerItem
                as="li"
                key={d.slug}
                className="flex items-center gap-3 rounded-full py-2.5 pl-4 pr-3 text-[0.9375rem] text-ink"
                style={{ background: sectionHl(d.slug) }}
              >
                <SectionChip domain={d.slug} />
                <span className="flex-1">{d.title}</span>
                <span className="rounded-full bg-card/70 px-2 py-0.5 font-mono text-xs">{d.weight}%</span>
              </StaggerItem>
            ))}
          </Stagger>
        </>
      ) : (
        <Stagger className="mt-1" delay={0.2} step={0.05}>
          {bank.domains.map((d) => {
            const topics = bank.topics
              .filter((t) => t.domain === d.slug)
              .map((t) => ({ t, m: mastery.get(t.slug)! }))
              .filter((x) => x.m.value !== null || dueTopics.has(x.t.slug))
              .sort((a, b) => (a.m.value ?? 1) - (b.m.value ?? 1));
            return (
              <StaggerItem as="section" key={d.slug} aria-label={d.title}>
                <p className="mt-5 flex items-center gap-2 text-[0.8125rem] text-muted">
                  <SectionChip domain={d.slug as DomainSlug} />
                  {d.title} · {d.weight}%
                </p>
                {topics.length === 0 ? (
                  <p className="mt-1.5 rounded-full bg-panel px-4 py-2 text-sm text-muted">No answers here yet.</p>
                ) : (
                  <ul className="mt-1.5 grid gap-1">
                    {topics.map(({ t, m }) => {
                      const weak = m.value !== null && m.value < TARGET;
                      const mastered = m.value !== null && m.value >= MASTERED;
                      const due = dueTopics.has(t.slug);
                      return (
                        <li
                          key={t.slug}
                          className={cn(
                            "grid grid-cols-[1fr_auto] items-center gap-3 rounded-full py-1.5 pl-4 pr-1.5 transition-transform duration-200 hover:translate-x-0.5",
                            !weak && "bg-panel/60",
                          )}
                          style={weak ? { background: sectionHl(t.domain) } : undefined}
                        >
                          <span className="min-w-0">
                            <Link
                              href={`/topics/${t.slug}/`}
                              className={cn("text-[0.9375rem] text-ink no-underline hover:underline", due && "mark-due")}
                            >
                              {t.title}
                            </Link>
                            <span className="sr-only">
                              {weak ? ", weak" : mastered ? ", mastered" : ""}
                              {due ? ", review due" : ""}
                            </span>
                          </span>
                          <span className="flex items-center justify-end gap-1">
                            {mastered && <PencilTick />}
                            {m.value === null ? (
                              <span className="px-3 font-mono text-xs text-muted">–</span>
                            ) : (
                              <MasteryPct value={m.value} />
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </StaggerItem>
            );
          })}
          <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="rounded-full px-2 py-0.5 text-ink" style={{ background: sectionHl("streams") }}>
                tinted
              </span>
              under {Math.round(TARGET * 100)}%
            </span>
            <span>
              <span className="mark-due">dashed</span> review due
            </span>
            <span className="inline-flex items-center gap-1">
              <PencilTick /> {Math.round(MASTERED * 100)}% or better
            </span>
          </p>
        </Stagger>
      )}

      {last.length > 0 && (
        <div className="mt-7 rounded-[20px] bg-panel p-4">
          <p className="text-[0.9375rem] text-muted">
            Last {last.length} {last.length === 1 ? "answer" : "answers"} ·{" "}
            <span className="font-mono text-ink">
              {last.filter((r) => r.correct).length}/{last.length}
            </span>
          </p>
          <MarkRun results={last.map((r) => r.correct)} className="mt-1.5 text-2xl" />
        </div>
      )}
    </Reveal>
  );
}
