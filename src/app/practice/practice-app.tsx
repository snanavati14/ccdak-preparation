"use client";

import { Alert, Button, Header, Label, ListBox, Select } from "@heroui/react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BankGate } from "@/components/bank-gate";
import { QuestionCard } from "@/components/question-card";
import { SectionChip } from "@/components/marks";
import { Key, PageHeader, Segmented } from "@/components/kit";
import { Stagger, StaggerItem } from "@/components/motion";
import { SessionBar } from "@/components/session-bar";
import { PrimaryLink, SecondaryLink, SessionSummary } from "@/components/session-summary";
import { useFocusMode } from "@/lib/focus-mode";
import { cn } from "@/lib/utils";
import type { BankIndex } from "@/lib/bank";
import type { Question } from "@/lib/content/schema";
import { weakestTopics } from "@/lib/plan";
import { pickDiagnostic, pickMixed, pickPractice } from "@/lib/select";
import { getProgress, type AnswerRecord } from "@/lib/storage";
import { DIAGNOSTIC_SIZE, recordAnswer, toggleFlag } from "@/lib/study";
import { useProgress } from "@/lib/use-progress";

const SIZES = [10, 20, 30] as const;

type Plan = { mode: "diagnostic" | "practice"; title: string; questions: Question[] };

function planFrom(params: URLSearchParams, bank: BankIndex): Plan | null {
  const progress = getProgress();
  if (params.get("mode") === "diagnostic") {
    const done = progress.log.filter((r) => r.mode === "diagnostic").length;
    return { mode: "diagnostic", title: "Diagnostic", questions: pickDiagnostic(bank, progress, Math.max(0, DIAGNOSTIC_SIZE - done)) };
  }
  const ids = params.get("ids");
  if (ids) {
    const qs = ids.split(",").map((id) => bank.byId.get(id)).filter((q): q is Question => !!q);
    return { mode: "practice", title: "Practice again", questions: qs };
  }
  const size = Number(params.get("size")) || 20;
  const topics = (params.get("topics") ?? params.get("topic") ?? "").split(",").filter((t) => bank.topicBySlug.has(t));
  const domain = params.get("domain");
  if (domain) topics.push(...bank.topics.filter((t) => t.domain === domain).map((t) => t.slug));
  if (!topics.length && params.get("mixed") === null) return null;
  const title = topics.length
    ? domain
      ? (bank.domainBySlug.get(domain as never)?.title ?? "Practice")
      : topics.map((t) => bank.topicBySlug.get(t)!.title).join(", ")
    : "Mixed practice";
  const questions = topics.length ? pickPractice(bank, progress, size, topics) : pickMixed(bank, progress, size);
  return { mode: "practice", title, questions };
}

export function PracticeApp() {
  const params = useSearchParams();
  return (
    <BankGate>
      {(bank) => {
        const plan = planFrom(new URLSearchParams(params.toString()), bank);
        return plan ? <Session key={params.toString()} plan={plan} bank={bank} /> : <Setup bank={bank} />;
      }}
    </BankGate>
  );
}


const fieldLabel = "block text-sm font-semibold";

function Setup({ bank }: { bank: BankIndex }) {
  const router = useRouter();
  const progress = useProgress();
  const [scope, setScope] = useState("mixed");
  const [size, setSize] = useState<number>(20);
  const weakest = weakestTopics(progress, bank, 3);
  const form = useRef<HTMLFormElement>(null);

  function go() {
    const q = new URLSearchParams({ size: String(size) });
    if (scope === "mixed") q.set("mixed", "");
    else if (scope === "weakest") q.set("topics", weakest.map((t) => t.slug).join(","));
    else if (scope.startsWith("domain:")) q.set("domain", scope.slice(7));
    else q.set("topic", scope);
    router.push(`/practice/?${q.toString()}`);
  }

  // Enter starts from anywhere on the page, including the (closed) scope picker and the size pills.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const trigger = !!el && el.matches("[data-slot=select-trigger], [data-slot=select-trigger] *") && el.getAttribute("aria-expanded") !== "true";
      const inForm = !!el && form.current?.contains(el) && (el.tagName === "INPUT" || trigger);
      if (el && el !== document.body && !inForm) return;
      e.preventDefault();
      e.stopPropagation();
      form.current?.requestSubmit();
    }
    // Capture, so a focused picker doesn't open on the same Enter.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const counts = new Map<string, number>();
  for (const q of bank.questions) for (const t of q.topics) counts.set(t, (counts.get(t) ?? 0) + 1);

  return (
    <div className="max-w-3xl">
      <PageHeader title="Practice" lead="Instant feedback after each answer. Misses go into review automatically." />
      <Stagger className="grid gap-4">
        {!progress.diagnosticDone && (
          <StaggerItem>
            <Alert status="warning" role="note">
              <Alert.Content>
                <Alert.Description>
                  The diagnostic isn&apos;t finished, so Today has nothing to plan from yet.{" "}
                  <Link href="/practice/?mode=diagnostic" className="font-semibold text-ink">
                    Take the diagnostic
                  </Link>
                </Alert.Description>
              </Alert.Content>
            </Alert>
          </StaggerItem>
        )}
        <StaggerItem className="rounded-[28px] bg-card p-6 sm:p-8">
          <form
            ref={form}
            onSubmit={(e) => {
              e.preventDefault();
              go();
            }}
            className="grid gap-9"
          >
            <div>
              <Select value={scope} onChange={(k) => k !== null && setScope(String(k))} className="w-full max-w-lg">
                <Label className={fieldLabel}>What to practise</Label>
                <Select.Trigger className="mt-2 min-h-12 rounded-full bg-panel px-5">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover className="rounded-[20px]">
                  <ListBox>
                    <ListBox.Item id="mixed" textValue="Mixed, weighted like the exam">
                      Mixed, weighted like the exam
                    </ListBox.Item>
                    {weakest.length > 0 ? (
                      <ListBox.Item id="weakest" textValue="My weakest topics">
                        My weakest topics ({weakest.map((t) => t.title).join(", ")})
                      </ListBox.Item>
                    ) : null}
                    {bank.domains.map((d) => (
                      <ListBox.Section key={d.slug}>
                        <Header>{d.title}</Header>
                        <ListBox.Item id={`domain:${d.slug}`} textValue={`All of ${d.title}`}>
                          All of {d.title}
                        </ListBox.Item>
                        {bank.topics
                          .filter((t) => t.domain === d.slug && counts.get(t.slug))
                          .map((t) => (
                            <ListBox.Item key={t.slug} id={t.slug} textValue={t.title}>
                              {t.title} ({counts.get(t.slug)})
                            </ListBox.Item>
                          ))}
                      </ListBox.Section>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              {weakest.length > 0 && (
                <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
                  Weakest now:
                  {weakest.map((t) => (
                    <span
                      key={t.slug}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-ink"
                      style={{ background: `var(--hl-${t.domain})` }}
                    >
                      <SectionChip domain={t.domain} />
                      {t.title}
                    </span>
                  ))}
                </p>
              )}
            </div>
            <div>
              <p className={fieldLabel} id="size-label">
                Questions
              </p>
              <Segmented
                label="Questions"
                value={String(size)}
                onChange={(v) => setSize(Number(v))}
                options={SIZES.map((n) => ({ value: String(n), label: n }))}
                className="mt-2"
                mono
              />
              <p className="mt-2 text-sm text-muted">About {Math.round((size * 1.5) / 5) * 5} minutes at exam pace.</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" size="lg">
                Start practice
              </Button>
              <span className="hidden text-sm text-muted sm:inline">
                or press <Key>Enter</Key>
              </span>
            </div>
          </form>
        </StaggerItem>
      </Stagger>
    </div>
  );
}

const EASE = [0.22, 1, 0.36, 1] as const;

function Session({ plan, bank }: { plan: Plan; bank: BankIndex }) {
  const progress = useProgress();
  const [questions] = useState(plan.questions);
  const [idx, setIdx] = useState(0);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [ended, setEnded] = useState(false);
  const focus = useFocusMode();
  const q = questions[idx];
  const answered = records.length > idx ? records[idx] : undefined;

  if (ended || !q) {
    const missed = records.filter((r) => !r.correct).map((r) => r.questionId);
    const diag = plan.mode === "diagnostic";
    return (
      <SessionSummary
        title={diag ? (progress.diagnosticDone ? "Diagnostic complete" : "Diagnostic paused") : `${plan.title}: done`}
        records={records}
        bank={bank}
      >
        {diag && progress.diagnosticDone ? (
          <>
            <PrimaryLink href="/">See today&apos;s plan</PrimaryLink>
            <SecondaryLink href="/topics/">Mastery by topic</SecondaryLink>
          </>
        ) : diag ? (
          <PrimaryLink href="/practice/?mode=diagnostic">Resume diagnostic</PrimaryLink>
        ) : (
          <>
            <PrimaryLink href="/">Back to Today</PrimaryLink>
            {missed.length > 0 && <SecondaryLink href={`/practice/?ids=${missed.join(",")}`}>Retry the misses now</SecondaryLink>}
          </>
        )}
      </SessionSummary>
    );
  }

  const last = idx === questions.length - 1;
  return (
    <div className="max-w-3xl">
      <SessionBar
        title={plan.title}
        done={records.length}
        total={questions.length}
        answered={records.length}
        onEnd={() => setEnded(true)}
      />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={q.id}
          initial={{ opacity: 0, x: 32, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -32, scale: 0.98 }}
          transition={{ duration: 0.32, ease: EASE }}
        >
          <QuestionCard
            q={q}
            bank={bank}
            offset={answered?.offset ?? progress.log.length}
            position={`${idx + 1} / ${questions.length}`}
            flagged={progress.flags.includes(q.id)}
            onToggleFlag={() => toggleFlag(q.id)}
            onSubmit={(chosen, ms) => {
              const rec = recordAnswer(q, chosen, plan.mode, ms);
              setRecords((r) => [...r, rec]);
            }}
            onNext={() => (last ? setEnded(true) : setIdx((i) => i + 1))}
            nextLabel={last ? "Finish" : "Next question"}
            focusMode
          />
        </motion.div>
      </AnimatePresence>
      <p className={cn("mt-8 px-2 text-xs text-muted transition-opacity duration-500", focus ? "opacity-0" : "opacity-100")} aria-hidden={focus}>
        Misses go to review automatically. <Key>F</Key> flags a question for review even when you get it right.
      </p>
    </div>
  );
}
