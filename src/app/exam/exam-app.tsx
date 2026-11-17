"use client";

import { Accordion, Button } from "@heroui/react";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useEffectEvent, useId, useMemo, useRef, useState } from "react";
import { BankGate } from "@/components/bank-gate";
import { ConfirmModal, Eyebrow, Key, LinkButton, PageHeader } from "@/components/kit";
import { InlineMarkdown, Markdown } from "@/components/markdown";
import { MasteryBar } from "@/components/mastery-bar";
import { Lift, PillBar, Reveal, SPRING, Stagger, StaggerItem } from "@/components/motion";
import { ChoiceCounter, FlagButton, OptionRow, QuestionMeta } from "@/components/question-card";
import { PenCross, PenTick, SectionChip } from "@/components/marks";
import { Stepper } from "@/components/session-bar";
import { Confetti, type ConfettiRef } from "@/components/ui/confetti";
import { NumberTicker } from "@/components/ui/number-ticker";
import { cn } from "@/lib/utils";
import { stemLine } from "@/components/session-summary";
import type { BankIndex } from "@/lib/bank";
import type { DomainSlug, Question } from "@/lib/content/schema";
import { TARGET } from "@/lib/plan";
import { pickExam } from "@/lib/select";
import { getProgress, updateProgress, type ActiveExam, type ExamResult } from "@/lib/storage";
import { isCorrect, recordAnswers } from "@/lib/study";
import { useProgress } from "@/lib/use-progress";

const SIZE = 60;
const MINUTES = 90;

export function ExamApp() {
  return <BankGate>{(bank) => <Exam bank={bank} />}</BankGate>;
}

function Exam({ bank }: { bank: BankIndex }) {
  const progress = useProgress();
  const [resultId, setResultId] = useState<string | null>(null);
  const [fresh, setFresh] = useState(false);
  const active = progress.activeExam;
  const result = resultId ? progress.exams.find((e) => e.id === resultId) : undefined;

  if (result) return <Results result={result} bank={bank} fresh={fresh} />;
  if (active)
    return (
      <Sitting
        exam={active}
        bank={bank}
        onDone={(id) => {
          setFresh(true);
          setResultId(id);
        }}
      />
    );
  return <Start bank={bank} onShowResult={setResultId} />;
}

function startExam(bank: BankIndex) {
  const now = Date.now();
  const questions = pickExam(bank, getProgress(), SIZE);
  const exam: ActiveExam = {
    id: `exam-${now}`,
    startedAt: now,
    deadline: now + MINUTES * 60_000,
    questionIds: questions.map((q) => q.id),
    answers: {},
    flags: [],
    msPerQuestion: {},
    current: 0,
  };
  updateProgress((p) => ({ ...p, activeExam: exam }));
}

function Start({ bank, onShowResult }: { bank: BankIndex; onShowResult: (id: string) => void }) {
  const progress = useProgress();
  const size = Math.min(SIZE, bank.questions.length);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Mock exam">
        <p className="mt-4 flex items-center gap-1.5" aria-hidden>
          {bank.domains.map((d) => (
            <SectionChip key={d.slug} domain={d.slug} className="h-2.5 w-8" />
          ))}
        </p>
      </PageHeader>
      <Stagger className="grid gap-4">
        <StaggerItem className="rounded-[28px] bg-card p-6 sm:p-8">
          <ul className="grid gap-2 text-[1.0625rem]">
            {[
              <>
                {size} questions in {MINUTES} minutes, weighted by section as in Confluent&apos;s exam guide. Some are
                multiple-response.
              </>,
              <>No feedback until you submit. Flag anything you want to revisit; a review list comes before submitting.</>,
              <>The timer keeps running if you leave the page, and the exam submits itself when time runs out.</>,
              <>
                The target is {Math.round(TARGET * 100)}%. Confluent doesn&apos;t publish the pass mark, so treat that as
                a margin, not the line.
              </>,
            ].map((line, i) => (
              <li key={i} className="flex gap-3 rounded-[20px] bg-panel px-4 py-3">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-ink font-mono text-xs text-on-ink">
                  {i + 1}
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <Button size="lg" onPress={() => startExam(bank)} className="mt-7">
            Start the {MINUTES}-minute exam
            <ArrowRight aria-hidden className="size-4" />
          </Button>
        </StaggerItem>

        {progress.exams.length > 0 && (
          <StaggerItem as="section" aria-labelledby="past" className="rounded-[28px] bg-card p-4 sm:p-6">
            <Eyebrow id="past" className="px-2 pb-3">
              Past mocks
            </Eyebrow>
            <Stagger as="ol" className="grid gap-1.5" step={0.04}>
              {[...progress.exams].reverse().map((e) => (
                <Lift as="li" key={e.id}>
                  <button
                    type="button"
                    onClick={() => onShowResult(e.id)}
                    className="flex min-h-12 w-full cursor-pointer items-center justify-between gap-4 rounded-full bg-panel py-2 pl-4 pr-2 text-left font-medium transition-colors hover:bg-panel-hover active:scale-[0.99]"
                  >
                    <span className="inline-flex items-center gap-2">
                      {e.score >= TARGET ? <PenTick title="at or above target" /> : <PenCross title="below target" />}
                      {new Date(e.finishedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1 font-mono text-sm",
                        e.score < TARGET ? "bg-wrong-soft font-medium text-wrong" : "bg-correct-soft text-correct",
                      )}
                    >
                      {Math.round(e.score * 100)}%
                    </span>
                  </button>
                </Lift>
              ))}
            </Stagger>
          </StaggerItem>
        )}
      </Stagger>
    </div>
  );
}

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function clock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function patchExam(fn: (e: ActiveExam) => ActiveExam) {
  updateProgress((p) => (p.activeExam ? { ...p, activeExam: fn(p.activeExam) } : p));
}

function submitExam(bank: BankIndex): string | null {
  const exam = getProgress().activeExam;
  if (!exam) return null;
  const questions = exam.questionIds.map((id) => bank.byId.get(id)).filter((q): q is Question => !!q);
  const right = questions.filter((q) => isCorrect(q, exam.answers[q.id] ?? [])).length;
  const result: ExamResult = {
    id: exam.id,
    startedAt: exam.startedAt,
    finishedAt: Date.now(),
    questionIds: exam.questionIds,
    answers: exam.answers,
    msPerQuestion: exam.msPerQuestion,
    score: questions.length ? right / questions.length : 0,
  };
  recordAnswers(
    questions.map((q) => ({ q, chosen: exam.answers[q.id] ?? [], ms: exam.msPerQuestion[q.id] })),
    "exam",
  );
  updateProgress((p) => ({ ...p, activeExam: undefined, exams: [...p.exams, result] }));
  return result.id;
}

function Sitting({ exam, bank, onDone }: { exam: ActiveExam; bank: BankIndex; onDone: (id: string) => void }) {
  const now = useNow(1000);
  const [reviewing, setReviewing] = useState(false);
  const shownAt = useRef(0);
  const questions = useMemo(
    () => exam.questionIds.map((id) => bank.byId.get(id)).filter((q): q is Question => !!q),
    [exam.questionIds, bank],
  );
  const idx = Math.min(exam.current, questions.length - 1);
  const q = questions[idx];
  const left = exam.deadline - now;
  const chosen = exam.answers[q.id] ?? [];
  const multi = q.type === "multi";
  const unanswered = questions.filter((x) => !exam.answers[x.id]?.length).length;
  const counterId = useId();

  // Time on each question accumulates whenever it's on screen.
  useEffect(() => {
    shownAt.current = Date.now();
    const id = q.id;
    return () => {
      const spent = Date.now() - shownAt.current;
      patchExam((e) => ({ ...e, msPerQuestion: { ...e.msPerQuestion, [id]: (e.msPerQuestion[id] ?? 0) + spent } }));
    };
  }, [q.id]);

  const done = left <= 0;
  useEffect(() => {
    if (!done) return;
    const id = submitExam(bank);
    if (id) onDone(id);
  }, [done, bank, onDone]);

  function choose(id: string) {
    patchExam((e) => {
      const cur = e.answers[q.id] ?? [];
      const next = multi ? (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]) : [id];
      return { ...e, answers: { ...e.answers, [q.id]: next } };
    });
  }
  const go = (i: number) => {
    setReviewing(false);
    patchExam((e) => ({ ...e, current: Math.max(0, Math.min(questions.length - 1, i)) }));
  };
  const flag = () =>
    patchExam((e) => ({
      ...e,
      flags: e.flags.includes(q.id) ? e.flags.filter((f) => f !== q.id) : [...e.flags, q.id],
    }));
  const [confirming, setConfirming] = useState(false);
  function submit() {
    setConfirming(true);
  }
  function confirmSubmit() {
    const id = submitExam(bank);
    if (id) onDone(id);
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    const el = e.target as HTMLElement;
    if (
      e.metaKey ||
      e.ctrlKey ||
      e.altKey ||
      el.tagName === "SELECT" ||
      (el.tagName === "INPUT" && !["radio", "checkbox"].includes((el as HTMLInputElement).type))
    )
      return;
    const k = { choose, go, flag, idx, reviewing, q };
    if (k.reviewing || confirming) return;
    const key = e.key.toUpperCase();
    const n = /^[1-6]$/.test(key) ? Number(key) - 1 : "ABCD".indexOf(key.length === 1 ? key : "?");
    if (n >= 0 && n < k.q.options.length) {
      e.preventDefault();
      k.choose(k.q.options[n].id);
    } else if (e.key === "Enter" && el.tagName !== "BUTTON" && el.tagName !== "A") {
      e.preventDefault();
      k.go(k.idx + 1);
    } else if (e.key === "ArrowRight") k.go(k.idx + 1);
    else if (e.key === "ArrowLeft") k.go(k.idx - 1);
    else if (key === "F") {
      e.preventDefault();
      k.flag();
    }
  });
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const lowTime = left < 10 * 60_000;
  const answeredCount = questions.length - unanswered;
  const header = (
    <div className="sticky top-[var(--nav-h)] z-30 mb-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className="grid gap-x-5 gap-y-3 rounded-[28px] bg-card px-5 py-3.5 shadow-float sm:grid-cols-[auto_1fr_auto] sm:items-center sm:rounded-full sm:py-2 sm:pl-7 sm:pr-2"
      >
        <p className="text-sm">
          <span className="font-semibold">Mock exam</span>
          <span className="text-muted">
            {" "}
            · {answeredCount} of {questions.length} answered · {exam.flags.length} flagged
          </span>
        </p>
        <Stepper done={answeredCount} total={questions.length} label="Questions answered" />
        <p className="flex items-center gap-2">
          <motion.span
            role="timer"
            aria-label="Time left"
            animate={lowTime ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={lowTime ? { duration: 1.6, repeat: Infinity } : SPRING}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-full px-4 font-mono text-base",
              lowTime ? "bg-wrong-soft font-medium text-wrong" : "bg-panel text-ink",
            )}
          >
            <Clock aria-hidden className="size-4" />
            {clock(left)}
          </motion.span>
          <Button variant={reviewing ? "tertiary" : "primary"} onPress={() => setReviewing((r) => !r)}>
            {reviewing ? "Back to question" : "Review and submit"}
          </Button>
        </p>
      </motion.div>
    </div>
  );

  const confirmModal = (
    <ConfirmModal
      open={confirming}
      onOpenChange={setConfirming}
      title="Submit the exam?"
      confirmLabel="Submit exam"
      cancelLabel="Keep checking"
      onConfirm={confirmSubmit}
    >
      {unanswered
        ? `${unanswered} ${unanswered === 1 ? "question is" : "questions are"} unanswered and will count as wrong. You can't change answers after this.`
        : "You can't change answers after this."}
    </ConfirmModal>
  );

  if (reviewing) {
    return (
      <div>
        {header}
        <Reveal className="max-w-3xl rounded-[28px] bg-card p-5 sm:p-8">
          <h1 className="text-2xl font-semibold tracking-[-0.025em]">Review before submitting</h1>
          <p className="mt-2 text-muted">
            {unanswered ? `${unanswered} unanswered.` : "Everything is answered."}{" "}
            {exam.flags.length ? `${exam.flags.length} flagged.` : ""}
          </p>
          <Stagger as="ol" className="mt-6 grid gap-1.5" step={0.015}>
            {questions.map((x, i) => {
              const a = exam.answers[x.id]?.length;
              const f = exam.flags.includes(x.id);
              return (
                <StaggerItem as="li" key={x.id}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    className="grid min-h-12 w-full cursor-pointer grid-cols-[2.25rem_1fr_auto] items-center gap-x-3 rounded-full bg-panel py-1.5 pl-1.5 pr-2 text-left transition-[background-color,transform] duration-200 hover:bg-panel-hover active:scale-[0.99]"
                  >
                    <span
                      className={cn(
                        "grid size-9 place-items-center rounded-full font-mono text-xs",
                        a ? "bg-ink text-on-ink" : "bg-card text-muted",
                      )}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate text-sm">
                      <InlineMarkdown>{stemLine(x.stem, 90)}</InlineMarkdown>
                    </span>
                    <span className="flex gap-1 text-xs">
                      {f && <span className="rounded-full bg-ink px-2.5 py-1 font-semibold text-on-ink">flagged</span>}
                      {a ? (
                        <span className="rounded-full bg-card px-2.5 py-1 text-muted">answered</span>
                      ) : (
                        <span className="mark-due rounded-full bg-caution-soft px-2.5 py-1 font-semibold text-caution">unanswered</span>
                      )}
                    </span>
                  </button>
                </StaggerItem>
              );
            })}
          </Stagger>
          <Button size="lg" onPress={submit} className="mt-8">
            Submit exam
          </Button>
          {confirmModal}
        </Reveal>
      </div>
    );
  }

  const flagged = exam.flags.includes(q.id);
  return (
    <div>
      {header}
      <AnimatePresence mode="wait" initial={false}>
        <motion.article
          key={q.id}
          initial={{ opacity: 0, x: 24, scale: 0.985 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -24, scale: 0.985 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl rounded-[28px] bg-card p-5 sm:p-8"
          aria-labelledby="exam-stem"
        >
          <div className="flex items-start justify-between gap-4">
            <QuestionMeta q={q} bank={bank} position={`Question ${idx + 1} of ${questions.length}`} />
            <FlagButton flagged={flagged} onToggle={flag} />
          </div>
          <div id="exam-stem" className="mt-6 text-lg leading-relaxed">
            <Markdown>{q.stem}</Markdown>
          </div>
          <fieldset className="mt-7" aria-describedby={multi ? counterId : undefined}>
            <legend className="sr-only">{multi ? `Choose ${q.correct.length}` : "Choose one"}</legend>
            {multi && <ChoiceCounter id={counterId} need={q.correct.length} have={chosen.length} />}
            <ul className="grid gap-2">
              {q.options.map((o, i) => (
                <li key={o.id}>
                  <OptionRow
                    multi={multi}
                    name={`exam-${q.id}`}
                    index={i}
                    checked={chosen.includes(o.id)}
                    onChange={() => choose(o.id)}
                  >
                    {o.text.includes("\n") ? <Markdown>{o.text}</Markdown> : <InlineMarkdown>{o.text}</InlineMarkdown>}
                  </OptionRow>
                </li>
              ))}
            </ul>
          </fieldset>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button variant="tertiary" size="lg" onPress={() => go(idx - 1)} isDisabled={idx === 0}>
              <ArrowLeft aria-hidden className="size-4" />
              Previous
            </Button>
            {idx < questions.length - 1 ? (
              <Button size="lg" onPress={() => go(idx + 1)}>
                Next
                <ArrowRight aria-hidden className="size-4" />
              </Button>
            ) : (
              <Button size="lg" onPress={() => setReviewing(true)}>
                Review and submit
              </Button>
            )}
            <span className="hidden text-sm text-muted sm:inline">
              <Key>Enter</Key> or <Key>→</Key> next, <Key>←</Key> back
            </span>
          </div>
        </motion.article>
      </AnimatePresence>
    </div>
  );
}

function Results({ result, bank, fresh }: { result: ExamResult; bank: BankIndex; fresh: boolean }) {
  const confetti = useRef<ConfettiRef>(null);
  const questions = result.questionIds.map((id) => bank.byId.get(id)).filter((q): q is Question => !!q);
  const right = (q: Question) => isCorrect(q, result.answers[q.id] ?? []);
  const byDomain = new Map<DomainSlug, { right: number; total: number }>();
  const byTopic = new Map<string, { right: number; total: number }>();
  for (const q of questions) {
    const d = byDomain.get(q.domain) ?? { right: 0, total: 0 };
    byDomain.set(q.domain, { right: d.right + (right(q) ? 1 : 0), total: d.total + 1 });
    for (const t of q.topics) {
      const s = byTopic.get(t) ?? { right: 0, total: 0 };
      byTopic.set(t, { right: s.right + (right(q) ? 1 : 0), total: s.total + 1 });
    }
  }
  const weakest = [...byTopic.entries()]
    .filter(([, s]) => s.right < s.total)
    .sort(([, a], [, b]) => a.right / a.total - b.right / b.total || b.total - a.total)
    .slice(0, 3)
    .map(([t]) => t);
  const times = questions.map((q) => ({ q, ms: result.msPerQuestion[q.id] ?? 0 }));
  const totalMs = result.finishedAt - result.startedAt;
  const avg = totalMs / Math.max(1, questions.length);
  const slowest = [...times].sort((a, b) => b.ms - a.ms).slice(0, 5);
  const pct = Math.round(result.score * 100);
  const missed = questions.filter((q) => !right(q));
  const passed = result.score >= TARGET;

  // Confetti only for a mock just finished at or above the target, never for old results.
  useEffect(() => {
    if (!fresh || !passed) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colours = ["fundamentals", "app-development", "streams", "connect", "testing", "observability"].map((d) =>
      getComputedStyle(document.documentElement).getPropertyValue(`--chip-${d}`).trim(),
    );
    const t = setTimeout(() => {
      void confetti.current?.fire({ particleCount: 90, spread: 75, startVelocity: 38, origin: { x: 0.25, y: 0.3 }, colors: colours, disableForReducedMotion: true });
    }, 500);
    return () => clearTimeout(t);
  }, [fresh, passed]);

  return (
    <Stagger className="grid max-w-3xl gap-4">
      {fresh && passed && (
        <Confetti ref={confetti} manualstart aria-hidden className="pointer-events-none fixed inset-0 z-50 size-full" />
      )}
      <StaggerItem className="rounded-[28px] bg-card p-6 sm:p-9">
        <h1 className="flex flex-wrap items-baseline gap-x-4 text-display font-semibold tracking-[-0.045em]">
          <span className={cn("rounded-full px-[0.25em]", passed ? "bg-[var(--hl-testing)]" : "bg-[var(--hl-streams)]")}>
            <NumberTicker value={pct} />%
          </span>
          <span className="font-mono text-xl font-normal tracking-normal text-muted">
            {questions.length - missed.length}/{questions.length}
          </span>
        </h1>
        <PillBar value={result.score} className="mt-6 h-3" />
        <p className="mt-5 max-w-[65ch] text-lg">
          {passed ? "At or above the 70% target." : `Below the 70% target by ${Math.round(TARGET * 100) - pct} points.`}{" "}
          <span className="text-muted">Confluent doesn&apos;t publish the pass mark; 70% is our margin.</span>
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {weakest.length > 0 && (
            <LinkButton href={`/practice/?topics=${weakest.join(",")}&size=20`} size="lg" arrow>
              Drill my 3 weakest topics
            </LinkButton>
          )}
          <LinkButton href="/" size="lg" variant="tertiary">
            Back to Today
          </LinkButton>
        </div>
        {weakest.length > 0 && (
          <p className="mt-3 text-sm text-muted">{weakest.map((t) => bank.topicBySlug.get(t)?.title).join(", ")}</p>
        )}
      </StaggerItem>

      <StaggerItem as="section" aria-labelledby="by-domain" className="rounded-[28px] bg-card p-5 sm:p-7">
        <Eyebrow id="by-domain">By exam section</Eyebrow>
        <table className="mt-3 w-full border-separate border-spacing-y-1.5 text-sm">
          <thead className="sr-only">
            <tr>
              <th>Section</th>
              <th>Right</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {bank.domains
              .filter((d) => byDomain.has(d.slug))
              .map((d) => {
                const s = byDomain.get(d.slug)!;
                const v = s.right / s.total;
                return (
                  <tr key={d.slug} className="bg-panel">
                    <td className="rounded-l-full py-2.5 pl-4 pr-4">
                      <span className="inline-flex items-center gap-2">
                        <SectionChip domain={d.slug} />
                        {d.title}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-muted">
                      {s.right}/{s.total}
                    </td>
                    <td className="w-2/5 rounded-r-full py-2.5 pr-3">
                      <MasteryBar value={v} />
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </StaggerItem>

      <StaggerItem as="section" aria-labelledby="timing" className="rounded-[28px] bg-card p-5 sm:p-7">
        <Eyebrow id="timing">Time</Eyebrow>
        <p className="mt-2 text-sm text-muted">
          {Math.round(totalMs / 60_000)} min in total, {Math.round(avg / 1000)} s a question on average (the exam allows
          about 90 s). Slowest:
        </p>
        <ol className="mt-3 grid gap-1.5">
          {slowest.map(({ q, ms }) => (
            <li key={q.id} className="grid grid-cols-[4.5rem_1fr] items-center gap-x-3 rounded-full bg-panel py-1.5 pl-1.5 pr-4 text-sm">
              <span className="rounded-full bg-card px-2 py-1 text-center font-mono text-xs">{Math.round(ms / 1000)} s</span>
              <span className="truncate">
                <InlineMarkdown>{stemLine(q.stem, 90)}</InlineMarkdown>
              </span>
            </li>
          ))}
        </ol>
      </StaggerItem>

      {missed.length > 0 && (
        <StaggerItem as="section" aria-labelledby="missed" className="rounded-[28px] bg-card p-5 sm:p-7">
          <Eyebrow id="missed">Missed ({missed.length}). These are now in review.</Eyebrow>
          <Accordion allowsMultipleExpanded className="mt-3 grid gap-1.5">
            {missed.map((q) => {
              const chosen = result.answers[q.id] ?? [];
              return (
                <Accordion.Item key={q.id} id={q.id} className="rounded-[20px] bg-panel">
                  <Accordion.Heading>
                    <Accordion.Trigger className="w-full rounded-[20px] px-5 py-3.5 text-sm hover:bg-panel-hover">
                      <span className="min-w-0 pr-3">
                        <InlineMarkdown>{stemLine(q.stem, 110)}</InlineMarkdown>
                      </span>
                      <Accordion.Indicator />
                    </Accordion.Trigger>
                  </Accordion.Heading>
                  <Accordion.Panel>
                    <Accordion.Body className="px-5 pb-5">
                      <Markdown>{q.stem}</Markdown>
                      <ul className="mt-3 grid gap-1.5 text-sm">
                        {q.options.map((o) => (
                          <li
                            key={o.id}
                            className={cn(
                              "flex items-start gap-2 rounded-[16px] px-3 py-2",
                              q.correct.includes(o.id)
                                ? "bg-correct-soft font-semibold text-correct"
                                : chosen.includes(o.id)
                                  ? "bg-wrong-soft text-wrong"
                                  : "pl-[calc(1.1em+1.25rem)] text-muted",
                            )}
                          >
                            {q.correct.includes(o.id) ? (
                              <PenTick className="mt-0.5" />
                            ) : chosen.includes(o.id) ? (
                              <PenCross className="mt-0.5" />
                            ) : null}
                            <span>
                              <span className={cn(chosen.includes(o.id) && !q.correct.includes(o.id) && "line-through")}>
                                <InlineMarkdown>{o.text}</InlineMarkdown>
                              </span>
                              {chosen.includes(o.id)
                                ? q.correct.includes(o.id)
                                  ? " · your answer, correct"
                                  : " · your answer, wrong"
                                : q.correct.includes(o.id)
                                  ? " · correct, not picked"
                                  : ""}
                            </span>
                          </li>
                        ))}
                      </ul>
                      {chosen.length === 0 && <p className="mt-2 text-sm font-semibold text-caution">Not answered.</p>}
                      <Markdown className="mt-4 max-w-[68ch] text-sm">{q.explanation}</Markdown>
                    </Accordion.Body>
                  </Accordion.Panel>
                </Accordion.Item>
              );
            })}
          </Accordion>
        </StaggerItem>
      )}
    </Stagger>
  );
}
