"use client";

import type { BankIndex } from "@/lib/bank";
import type { AnswerRecord } from "@/lib/storage";
import { LinkButton } from "./kit";
import { CommitMarker, LogList, LogRow } from "./log";
import { InlineMarkdown } from "./markdown";
import { MarkRun, PenCross, PenTick } from "./marks";
import { PillBar, Reveal, Stagger, StaggerItem } from "./motion";
import { NumberTicker } from "./ui/number-ticker";

/** First sentence of a stem, without code blocks, for one-line log rows. */
export function stemLine(stem: string, max = 120): string {
  const flat = stem.replace(/```[\s\S]*?```/g, " … ").replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  let cut = flat.slice(0, max - 1).trimEnd();
  // Don't leave a code span open, or the raw backtick shows.
  if ((cut.match(/`/g) ?? []).length % 2) cut = cut.slice(0, cut.lastIndexOf("`")).trimEnd();
  return cut + "…";
}

export function AnswerRow({ r, bank }: { r: AnswerRecord; bank: BankIndex }) {
  const q = bank.byId.get(r.questionId);
  return (
    <LogRow
      offset={r.offset}
      mark={r.correct ? <PenTick title="Right" /> : <PenCross title="Missed" />}
      aside={r.correct ? undefined : <span className="rounded-full bg-wrong-soft px-2.5 py-0.5 font-semibold text-wrong">missed</span>}
    >
      {q ? (
        <span className="text-sm">
          <InlineMarkdown>{stemLine(q.stem)}</InlineMarkdown>
        </span>
      ) : (
        <code className="text-sm">{r.questionId}</code>
      )}
    </LogRow>
  );
}

export function SessionSummary({
  title,
  records,
  bank,
  children,
}: {
  title: string;
  records: AnswerRecord[];
  bank: BankIndex;
  children?: React.ReactNode;
}) {
  const right = records.filter((r) => r.correct).length;
  const missed = records.filter((r) => !r.correct);
  const pct = records.length ? Math.round((right / records.length) * 100) : 0;
  const last = records.at(-1)?.offset ?? null;
  return (
    <Stagger className="grid max-w-3xl gap-4">
      <StaggerItem className="rounded-[28px] bg-card p-6 sm:p-9">
        <h1 className="text-3xl font-semibold tracking-[-0.035em]">{title}</h1>
        {records.length === 0 ? (
          <p className="mt-3 text-lg text-muted">Nothing answered in this session.</p>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-3">
              <span className="font-mono text-[3.5rem] font-medium leading-none tracking-[-0.04em]">
                <NumberTicker value={pct} />%
              </span>
              <p className="max-w-[44ch] pb-1 text-lg">
                {right} of {records.length} right.{" "}
                <span className="text-muted">
                  {missed.length > 0
                    ? `${missed.length} missed ${missed.length === 1 ? "question goes" : "questions go"} into review, due tomorrow.`
                    : "Nothing new for review."}
                </span>
              </p>
            </div>
            <PillBar value={pct / 100} className="mt-6 h-3" />
            <MarkRun results={records.map((r) => r.correct)} className="mt-4 text-xl" />
          </>
        )}
        {children && <div className="mt-8 flex flex-wrap items-center gap-3">{children}</div>}
      </StaggerItem>
      {records.length > 0 && (
        <Reveal delay={0.15} as="section" aria-label="This session" className="rounded-[28px] bg-card p-4 sm:p-6">
          <LogList label="Answers this session">
            {records.map((r) => (
              <AnswerRow key={r.offset} r={r} bank={bank} />
            ))}
          </LogList>
          <CommitMarker offset={last} />
        </Reveal>
      )}
    </Stagger>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <LinkButton href={href} size="lg" arrow>
      {children}
    </LinkButton>
  );
}

export function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <LinkButton href={href} size="lg" variant="tertiary">
      {children}
    </LinkButton>
  );
}
