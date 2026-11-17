"use client";

import { BankGate } from "@/components/bank-gate";
import { MasteryBar } from "@/components/mastery-bar";
import { masteryByTopic } from "@/lib/plan";
import { useProgress } from "@/lib/use-progress";

export function TopicMastery({ slug, questionCount }: { slug: string; questionCount: number }) {
  const progress = useProgress();
  return (
    <BankGate compact>
      {(bank) => {
        const m = masteryByTopic(progress, bank).get(slug);
        return (
          <div className="flex min-w-56 flex-1 items-center gap-3 rounded-full bg-panel py-2 pl-4 pr-2 text-sm">
            <span className="text-muted">Mastery</span>
            <span className="flex-1">
              <MasteryBar value={m?.value ?? null} label={m?.answers ? `${m.answers} of 3 answers needed` : `not practised yet · ${questionCount} questions`} />
            </span>
          </div>
        );
      }}
    </BankGate>
  );
}
