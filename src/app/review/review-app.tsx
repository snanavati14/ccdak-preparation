"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { BankGate } from "@/components/bank-gate";
import { PageHeader } from "@/components/kit";
import { PenTick } from "@/components/marks";
import { Reveal } from "@/components/motion";
import { QuestionCard } from "@/components/question-card";
import { SessionBar } from "@/components/session-bar";
import { PrimaryLink, SecondaryLink, SessionSummary } from "@/components/session-summary";
import type { BankIndex } from "@/lib/bank";
import { dueCards } from "@/lib/plan";
import { getProgress, type AnswerRecord } from "@/lib/storage";
import { recordAnswer, toggleFlag } from "@/lib/study";
import { useProgress } from "@/lib/use-progress";

const MAX_SESSION = 40;

export function ReviewApp() {
  return <BankGate>{(bank) => <Review bank={bank} />}</BankGate>;
}

function nextDueText(due: number, now: number) {
  const hours = Math.round((due - now) / 3_600_000);
  if (hours < 1) return "within the hour";
  if (hours < 24) return `in about ${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.round(hours / 24);
  return `in ${days} ${days === 1 ? "day" : "days"}`;
}

function Review({ bank }: { bank: BankIndex }) {
  const progress = useProgress();
  // The queue is fixed when the session opens, so answering doesn't reshuffle it.
  const [queue] = useState(() => dueCards(getProgress()).filter((id) => bank.byId.has(id)).slice(0, MAX_SESSION));
  const [now] = useState(() => Date.now());
  const [idx, setIdx] = useState(0);
  const [records, setRecords] = useState<AnswerRecord[]>([]);
  const [ended, setEnded] = useState(false);

  if (queue.length === 0) {
    const upcoming = Object.values(progress.cards).map((c) => c.due).filter((d) => d > now).sort((a, b) => a - b);
    const total = Object.keys(progress.cards).length;
    return (
      <div className="max-w-3xl">
        <PageHeader title="Review" />
        <Reveal delay={0.08} className="rounded-[28px] bg-card p-6 sm:p-9">
          <span aria-hidden className="grid size-14 place-items-center rounded-full bg-[var(--hl-testing)] text-2xl">
            <PenTick />
          </span>
          <p className="mt-5 max-w-[60ch] text-lg">
            {total === 0
              ? "Nothing to review yet. Missed and flagged questions land here, spaced out so they come back just before you'd forget them."
              : `Nothing due. ${total} ${total === 1 ? "card is" : "cards are"} scheduled; the next one is due ${nextDueText(upcoming[0] ?? now, now)}.`}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <PrimaryLink href="/practice/">Practice instead</PrimaryLink>
          </div>
        </Reveal>
      </div>
    );
  }

  const id = queue[idx];
  const q = id ? bank.byId.get(id) : undefined;
  if (ended || !q) {
    const right = records.filter((r) => r.correct).length;
    return (
      <SessionSummary title="Review done" records={records} bank={bank}>
        <PrimaryLink href="/">Back to Today</PrimaryLink>
        {right > 0 && <SecondaryLink href="/topics/">Mastery by topic</SecondaryLink>}
      </SessionSummary>
    );
  }

  const last = idx === queue.length - 1;
  const card = progress.cards[q.id];
  return (
    <div className="max-w-3xl">
      <SessionBar
        title={
          <>
            Review <span className="font-normal text-muted">· {card && card.lapses > 0 ? `missed ${card.lapses}×` : "flagged"}</span>
          </>
        }
        done={records.length}
        total={queue.length}
        answered={records.length}
        endLabel="End review"
        onEnd={() => setEnded(true)}
      />
      <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={q.id}
        initial={{ opacity: 0, x: 32, scale: 0.98 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -32, scale: 0.98 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
      <QuestionCard
        q={q}
        bank={bank}
        offset={records[idx]?.offset ?? progress.log.length}
        position={`${idx + 1} / ${queue.length} due`}
        flagged={progress.flags.includes(q.id)}
        onToggleFlag={() => toggleFlag(q.id)}
        onSubmit={(chosen, ms) => {
          const rec = recordAnswer(q, chosen, "review", ms);
          setRecords((r) => [...r, rec]);
        }}
        onNext={() => (last ? setEnded(true) : setIdx((i) => i + 1))}
        nextLabel={last ? "Finish" : "Next card"}
        focusMode
      />
      </motion.div>
      </AnimatePresence>
    </div>
  );
}
