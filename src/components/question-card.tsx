"use client";

import { Alert, Button, Tooltip } from "@heroui/react";
import { Flag } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useEffectEvent, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { configsFor, type BankIndex } from "@/lib/bank";
import type { Question } from "@/lib/content/schema";
import { formatOffset } from "@/lib/dates";
import { setFocusMode } from "@/lib/focus-mode";
import { isCorrect } from "@/lib/study";
import { cn } from "@/lib/utils";
import { InlineMarkdown, Markdown } from "./markdown";
import { Key } from "./kit";
import { CROSS_PATHS, SectionChip, TICK_PATH } from "./marks";
import { Collapse, SPRING } from "./motion";

const LETTERS = "ABCDEF";
const EASE = [0.22, 1, 0.36, 1] as const;

function isTyping(e: KeyboardEvent) {
  const el = e.target as HTMLElement | null;
  return (
    !!el &&
    ((el.tagName === "INPUT" &&
      (el as HTMLInputElement).type !== "radio" &&
      (el as HTMLInputElement).type !== "checkbox") ||
      el.tagName === "TEXTAREA" ||
      el.tagName === "SELECT" ||
      el.isContentEditable)
  );
}

function shuffled<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function QuestionMeta({
  q,
  bank,
  offset,
  position,
}: {
  q: Question;
  bank: BankIndex;
  offset?: number;
  position: string;
}) {
  const domain = bank.domainBySlug.get(q.domain);
  const topic = bank.topicBySlug.get(q.topics.find((t) => bank.topicBySlug.get(t)?.domain === q.domain) ?? q.topics[0]);
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
      <span className="rounded-full bg-ink px-3 py-1 font-mono text-xs text-on-ink">{position}</span>
      <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-ink" style={{ background: `var(--hl-${q.domain})` }}>
        <SectionChip domain={q.domain} />
        {domain?.title}
        {topic && <span className="text-ink/80"> · {topic.title}</span>}
      </span>
      {offset !== undefined && <span className="rounded-full bg-panel px-3 py-1 font-mono text-[0.6875rem]">#{formatOffset(offset)}</span>}
      {q.confidence === "unsure" && (
        <span className="rounded-full bg-caution-soft px-3 py-1 font-semibold text-caution">
          Unsure: docs are ambiguous or this changed between versions
        </span>
      )}
    </p>
  );
}

/** A pen stroke that draws itself in: the one moment the app animates with intent. */
export function DrawnMark({ kind, className, delay = 0 }: { kind: "tick" | "cross"; className?: string; delay?: number }) {
  const paths = kind === "tick" ? [TICK_PATH] : CROSS_PATHS;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={cn("inline-block shrink-0", kind === "tick" ? "text-correct" : "text-wrong", className)}
    >
      {paths.map((d, i) => (
        <motion.path
          key={d}
          d={d}
          stroke="currentColor"
          strokeWidth={2.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ pathLength: { duration: 0.32, delay: delay + i * 0.16, ease: EASE }, opacity: { duration: 0.01, delay: delay + i * 0.16 } }}
        />
      ))}
    </svg>
  );
}

export type OptionState = "pick-right" | "pick-wrong" | "missed" | "answer" | "other";

const STATE_LABEL: Record<OptionState, string> = {
  "pick-right": "Your answer · correct",
  "pick-wrong": "Your answer · wrong",
  missed: "Correct answer · not picked",
  answer: "Correct answer",
  other: "",
};

/** One option row: a key box with its letter, the text, and after marking a pen mark and label. */
export function OptionRow({
  multi,
  name,
  index,
  checked,
  disabled,
  onChange,
  state,
  children,
}: {
  multi: boolean;
  name: string;
  index: number;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  state?: OptionState;
  children: ReactNode;
}) {
  const marked = state !== undefined;
  return (
    <motion.label
      whileHover={marked ? undefined : { y: -1 }}
      whileTap={marked ? undefined : { scale: 0.985 }}
      transition={SPRING}
      className={cn(
        "ring-within grid grid-cols-[2.25rem_1fr] items-start gap-x-4 rounded-[20px] px-4 py-4 transition-[background-color,box-shadow,color] duration-200",
        !marked && "cursor-pointer",
        !marked && (checked ? "bg-panel shadow-[inset_0_0_0_2px_var(--ink)]" : "bg-panel/60 hover:bg-panel"),
        state === "pick-right" && "bg-correct-soft",
        state === "pick-wrong" && "bg-wrong-soft",
        (state === "missed" || state === "answer") && "bg-correct-soft/70 shadow-[inset_0_0_0_2px_var(--correct)]",
        state === "other" && "bg-panel/40 text-muted",
      )}
    >
      <span className="relative grid size-7 place-items-center">
        <input
          type={multi ? "checkbox" : "radio"}
          name={name}
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className="sr-only"
        />
        {state === "pick-right" || state === "missed" || state === "answer" ? (
          <DrawnMark kind="tick" className="size-7" delay={state === "pick-right" ? 0 : 0.2} />
        ) : state === "pick-wrong" ? (
          <DrawnMark kind="cross" className="size-7" />
        ) : (
          <motion.span
            aria-hidden
            animate={checked ? { scale: [1, 1.15, 1] } : { scale: 1 }}
            transition={{ duration: 0.28, ease: EASE }}
            className={cn(
              "grid size-8 place-items-center font-mono text-xs font-medium transition-colors duration-200",
              multi ? "rounded-[10px]" : "rounded-full",
              checked ? "bg-ink text-on-ink" : "bg-card text-ink shadow-[inset_0_0_0_1.5px_var(--line-strong)]",
              state === "other" && "text-muted",
            )}
          >
            {LETTERS[index]}
          </motion.span>
        )}
      </span>
      <span className="min-w-0 pt-0.5">
        <span className={cn(state === "pick-wrong" && "line-through decoration-wrong decoration-2")}>{children}</span>
        {marked && state !== "other" && (
          <motion.span
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: 0.15, ease: EASE }}
            className={cn(
              "mt-1.5 inline-block rounded-full bg-card/70 px-2.5 py-0.5 text-sm font-semibold",
              state === "pick-wrong" ? "text-wrong" : "text-correct",
            )}
          >
            {STATE_LABEL[state]}
          </motion.span>
        )}
      </span>
    </motion.label>
  );
}

/** "Choose 3 · 1 of 3 selected", in caution until the count is right. */
export function ChoiceCounter({ id, need, have }: { id: string; need: number; have: number }) {
  const ok = have === need;
  return (
    <motion.p
      id={id}
      aria-live="polite"
      layout
      transition={SPRING}
      className={cn(
        "mb-3 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-300",
        ok ? "bg-ink text-on-ink" : "bg-caution-soft text-caution",
      )}
    >
      Choose {need} · {have} of {need} selected
      {have > need && <span className="font-normal">, remove {have - need}</span>}
    </motion.p>
  );
}

/** Flag toggle as a pill, with its F key. */
export function FlagButton({ flagged, onToggle }: { flagged: boolean; onToggle: () => void }) {
  return (
    <Button
      size="sm"
      variant={flagged ? "primary" : "tertiary"}
      onPress={onToggle}
      aria-pressed={flagged}
      className="shrink-0"
    >
      <motion.span animate={{ rotate: flagged ? [0, -14, 0] : 0 }} transition={{ duration: 0.35 }} className="grid">
        <Flag aria-hidden className="size-3.5" fill={flagged ? "currentColor" : "none"} />
      </motion.span>
      {flagged ? "Flagged" : "Flag"} <Key className="ml-0.5">F</Key>
    </Button>
  );
}

/**
 * One question, answered with instant feedback. Keys: 1–6 or A–F choose,
 * Enter submits then advances, E toggles the explanation, F flags.
 */
export function QuestionCard({
  q,
  bank,
  offset,
  position,
  flagged,
  onToggleFlag,
  onSubmit,
  onNext,
  nextLabel = "Next question",
  focusMode = false,
}: {
  q: Question;
  bank: BankIndex;
  /** The offset this answer will take in the log. */
  offset: number;
  position: string;
  flagged: boolean;
  onToggleFlag: () => void;
  onSubmit: (chosen: string[], ms: number) => void;
  onNext: () => void;
  nextLabel?: string;
  /** Dim the nav and session chrome while the question is unanswered. */
  focusMode?: boolean;
}) {
  const options = useMemo(() => shuffled(q.options), [q]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [explain, setExplain] = useState(false);
  const started = useRef(0);
  const nextRef = useRef<HTMLButtonElement>(null);
  const multi = q.type === "multi";
  const need = q.correct.length;
  // Multiple-response submits only with exactly the number of answers asked for.
  const ready = multi ? chosen.length === need : chosen.length === 1;
  const right = submitted && isCorrect(q, chosen);
  const hintId = useId();

  useEffect(() => {
    started.current = performance.now();
  }, [q]);

  useEffect(() => {
    if (submitted) nextRef.current?.focus();
  }, [submitted]);

  useEffect(() => {
    if (!focusMode) return;
    setFocusMode(!submitted);
    return () => setFocusMode(false);
  }, [focusMode, submitted]);

  function toggle(id: string) {
    if (submitted) return;
    setChosen((c) => (multi ? (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]) : [id]));
  }

  function submit() {
    if (submitted || !ready) return;
    const ok = isCorrect(q, chosen);
    setSubmitted(true);
    setExplain(!ok); // explain-first on a miss
    onSubmit(chosen, Math.round(performance.now() - started.current));
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e)) return;
    const k = { toggle, submit, onNext, onToggleFlag, submitted, options };
    const key = e.key.toUpperCase();
    const idx = /^[1-6]$/.test(key) ? Number(key) - 1 : LETTERS.indexOf(key.length === 1 ? key : "?");
    // E and F stay reserved for explain and flag; options 5 and 6 use number keys.
    if (idx >= 0 && idx < k.options.length && key !== "E" && key !== "F") {
      e.preventDefault();
      k.toggle(k.options[idx].id);
    } else if (e.key === "Enter") {
      // Let a focused button or link do its own thing.
      const el = e.target as HTMLElement;
      if (el.tagName === "BUTTON" || el.tagName === "A") return;
      e.preventDefault();
      if (k.submitted) k.onNext();
      else k.submit();
    } else if (key === "E" && k.submitted) {
      e.preventDefault();
      setExplain((x) => !x);
    } else if (key === "F") {
      e.preventDefault();
      k.onToggleFlag();
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const configRows = submitted ? configsFor(q, bank) : [];
  const noteTopic = q.topics.map((t) => bank.topicBySlug.get(t)).find((t) => t?.hasNotes);

  function stateOf(id: string): OptionState | undefined {
    if (!submitted) return undefined;
    const isChosen = chosen.includes(id);
    const isAnswer = q.correct.includes(id);
    if (isChosen) return isAnswer ? "pick-right" : "pick-wrong";
    if (isAnswer) return right ? "answer" : "missed";
    return "other";
  }

  return (
    <article aria-labelledby={`stem-${q.id}`} className="max-w-3xl rounded-[28px] bg-card p-5 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <QuestionMeta q={q} bank={bank} offset={offset} position={position} />
        <FlagButton flagged={flagged} onToggle={onToggleFlag} />
      </div>

      <div id={`stem-${q.id}`} className="mt-6 text-lg leading-relaxed">
        <Markdown>{q.stem}</Markdown>
      </div>

      <fieldset className="mt-7" aria-describedby={multi && !submitted ? hintId : undefined}>
        <legend className="sr-only">{multi ? `Choose ${need} answers` : "Choose one answer"}</legend>
        {multi && !submitted && <ChoiceCounter id={hintId} need={need} have={chosen.length} />}
        <ul className="grid gap-2">
          {options.map((o, i) => (
            <li key={o.id}>
              <OptionRow
                multi={multi}
                name={`q-${q.id}`}
                index={i}
                checked={chosen.includes(o.id)}
                disabled={submitted}
                onChange={() => toggle(o.id)}
                state={stateOf(o.id)}
              >
                {o.text.includes("\n") ? <Markdown>{o.text}</Markdown> : <InlineMarkdown>{o.text}</InlineMarkdown>}
              </OptionRow>
            </li>
          ))}
        </ul>
      </fieldset>

      <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3" aria-live="polite">
        {!submitted ? (
          <>
            {/* Says why Submit is still struck through, on hover and keyboard focus. */}
            <Tooltip delay={150} isDisabled={ready}>
              <Button
                size="lg"
                onPress={submit}
                aria-disabled={!ready}
                aria-describedby={`${hintId}-why`}
                className="pointer-events-auto aria-disabled:cursor-not-allowed"
              >
                <span className={cn(!ready && "line-through decoration-2")}>Submit</span>
              </Button>
              <Tooltip.Content placement="top">
                {multi ? `Choose ${need} answers first (${chosen.length} chosen)` : "Choose an answer first"}
              </Tooltip.Content>
            </Tooltip>
            <span id={`${hintId}-why`} className="text-sm text-muted">
              {!ready ? (
                multi ? (
                  <>Submit opens once {need} answers are chosen.</>
                ) : (
                  <>Choose an answer to submit.</>
                )
              ) : (
                <>
                  <Key>Enter</Key> to submit
                </>
              )}
              <span className="hidden sm:inline">
                {" "}
                · <Key>1</Key>–<Key>{options.length}</Key>
                {options.length <= 4 && (
                  <>
                    {" "}
                    or <Key>A</Key>–<Key>{LETTERS[options.length - 1]}</Key>
                  </>
                )}{" "}
                to choose
              </span>
            </span>
          </>
        ) : (
          <>
            <motion.p
              initial={{ opacity: 0, scale: 0.9, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={SPRING}
              className={cn(
                "flex items-center gap-2 rounded-full py-2 pl-3 pr-5 text-lg font-semibold",
                right ? "bg-correct-soft text-correct" : "bg-wrong-soft text-wrong",
              )}
            >
              <DrawnMark kind={right ? "tick" : "cross"} className="size-7" />
              {right ? "Correct." : multi ? "Missed: not exactly the right set." : "Missed."}
            </motion.p>
            <Button ref={nextRef} size="lg" onPress={onNext}>
              {nextLabel}
            </Button>
            <Button
              variant="tertiary"
              onPress={() => setExplain((x) => !x)}
              aria-expanded={explain}
              aria-controls={`explain-${q.id}`}
            >
              {explain ? "Hide explanation" : "Show explanation"} <Key>E</Key>
            </Button>
          </>
        )}
      </div>

      <Collapse open={submitted && explain} id={`explain-${q.id}`}>
          <section aria-label="Explanation">
            <div className="mt-8 rounded-[20px] bg-panel p-5 sm:p-7">
              <h2 className="text-lg font-semibold tracking-[-0.01em]">
                {right ? "Why this is right" : "Why the right answer is right, and yours isn't"}
              </h2>
              <Markdown className="mt-3 max-w-[68ch]">{q.explanation}</Markdown>

              {q.kafkaVersionNote && (
                <Alert status="warning" role="note" className="mt-4 max-w-[68ch]">
                  <Alert.Content>
                    <Alert.Title>Version note</Alert.Title>
                    <Alert.Description>{q.kafkaVersionNote}</Alert.Description>
                  </Alert.Content>
                </Alert>
              )}

              {configRows.length > 0 && (
                <div className="mt-7">
                  <h3 className="text-sm font-semibold">Configs involved</h3>
                  <dl className="mt-2 grid gap-1.5 text-sm">
                    {configRows.map((c) => (
                      <div key={`${c.scope}-${c.name}`} className="grid gap-x-4 rounded-[16px] bg-card px-4 py-3 sm:grid-cols-[minmax(12rem,auto)_1fr]">
                        <dt>
                          <Link href={`/configs/?q=${encodeURIComponent(c.name)}`} className="font-mono text-[0.8125rem] text-ink">
                            {c.name}
                          </Link>
                          <span className="block text-xs text-muted">
                            {c.scope}, default <code className="font-mono">{c.default}</code>
                          </span>
                        </dt>
                        <dd className="text-muted">{c.meaning}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}

              <div className="mt-7 flex flex-col items-start gap-1.5 text-sm">
                {noteTopic && (
                  <Link href={`/topics/${noteTopic.slug}/#gotchas-the-exam-loves`} className="font-semibold text-ink">
                    Topic notes: {noteTopic.title}
                  </Link>
                )}
                {q.references.map((r) => (
                  <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="text-muted hover:text-ink">
                    {r.title} <span className="text-xs">({r.kind === "official" ? "official docs" : r.kind})</span>
                  </a>
                ))}
              </div>
            </div>
          </section>
      </Collapse>
    </article>
  );
}
