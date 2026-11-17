"use client";

import Link from "next/link";
import { Badge } from "@/components/badge";
import { BankGate } from "@/components/bank-gate";
import { Eyebrow, LinkButton } from "@/components/kit";
import { MasteryPct } from "@/components/mastery-bar";
import { PencilTick, SectionChip } from "@/components/marks";
import { Lift, Stagger, StaggerItem } from "@/components/motion";
import { sectionHl } from "@/components/sections";
import type { BankIndex, BankTopic } from "@/lib/bank";
import { dueCards, masteryByTopic, TARGET, type Mastery } from "@/lib/plan";
import { useProgress } from "@/lib/use-progress";
import { cn } from "@/lib/utils";

const MASTERED = 0.85;

export function TopicsMap() {
  return <BankGate>{(bank) => <TopicList bank={bank} />}</BankGate>;
}

type Row = { t: BankTopic; m: Mastery; due: boolean; count: number };

function TopicRow({ row, bank, showSection }: { row: Row; bank: BankIndex; showSection: boolean }) {
  const { t, m, due, count } = row;
  const weak = m.value !== null && m.value < TARGET;
  const mastered = m.value !== null && m.value >= MASTERED;
  const domain = bank.domainBySlug.get(t.domain);
  const drillSize = count >= 20 ? 20 : 10;
  return (
    <Lift
      as="li"
      className={cn(
        "grid grid-cols-[1fr_auto] items-center gap-x-5 gap-y-2 rounded-[20px] px-5 py-3.5 sm:grid-cols-[1fr_7rem_auto]",
        !weak && "bg-panel",
      )}
      style={weak ? { background: sectionHl(t.domain) } : undefined}
    >
      <div className="min-w-0">
        <Link href={`/topics/${t.slug}/`} className={cn("font-semibold text-ink no-underline hover:underline", due && "mark-due")}>
          {t.title}
        </Link>
        <span className="sr-only">
          {weak ? ", weak" : mastered ? ", mastered" : ""}
          {due ? ", review due" : ""}
        </span>
        <span className={cn("mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs", weak ? "text-ink" : "text-muted")}>
          {showSection && (
            <span className="inline-flex items-center gap-1.5">
              <SectionChip domain={t.domain} className="size-2" />
              {domain?.title}
            </span>
          )}
          {t.badge !== domain?.badge && <Badge value={t.badge} />}
          <span className="font-mono">{count} q</span>
        </span>
      </div>
      <div className="text-right" aria-label={`Mastery for ${t.title}`}>
        {m.value !== null ? (
          <span className={cn("inline-flex items-center gap-1", weak && "font-medium")}>
            {mastered && <PencilTick title="mastered" />}
            <MasteryPct value={m.value} />
          </span>
        ) : (
          <span className={cn("text-xs", weak ? "text-ink" : "text-muted")}>
            {m.answers ? `${m.answers} of 3 answers` : "not practised"}
          </span>
        )}
      </div>
      <div className="col-span-2 sm:col-span-1 sm:text-right">
        {count > 0 ? (
          <LinkButton href={`/practice/?topic=${t.slug}&size=${drillSize}`} variant={weak ? "primary" : "tertiary"} size="sm" arrow className={weak ? undefined : "bg-card"}>
            Drill<span className="sr-only"> {t.title}</span>
          </LinkButton>
        ) : (
          <span className="mark-spent text-sm">Drill</span>
        )}
      </div>
    </Lift>
  );
}

function TopicList({ bank }: { bank: BankIndex }) {
  const progress = useProgress();
  const mastery = masteryByTopic(progress, bank);
  const due = new Set(dueCards(progress).flatMap((id) => bank.byId.get(id)?.topics ?? []));
  const counts = new Map<string, number>();
  for (const q of bank.questions) for (const t of q.topics) counts.set(t, (counts.get(t) ?? 0) + 1);
  const rows: Row[] = bank.topics.map((t) => ({
    t,
    m: mastery.get(t.slug)!,
    due: due.has(t.slug),
    count: counts.get(t.slug) ?? 0,
  }));
  const hasProgress = rows.some((r) => r.m.answers > 0);

  if (hasProgress) {
    // Weakest first, weighted by the section's share of the exam; unpractised topics follow in section order.
    const siblings = (d: string) => bank.topics.filter((t) => t.domain === d).length || 1;
    const priority = (r: Row) => {
      const weight = (bank.domainBySlug.get(r.t.domain)?.weight ?? 0) / siblings(r.t.domain);
      return weight * (1 - (r.m.value ?? 0));
    };
    const scored = rows.filter((r) => r.m.value !== null).sort((a, b) => priority(b) - priority(a));
    const rest = rows.filter((r) => r.m.value === null);
    return (
      <div className="mt-5 grid gap-5">
        <section className="rounded-[28px] bg-card p-4 sm:p-6">
          <Eyebrow className="px-2">Weakest first</Eyebrow>
          <p className="mt-1 px-2 text-sm text-muted">
            Ordered by the gap to 100% times the section&apos;s exam weight. Tinted topics are under {Math.round(TARGET * 100)}%.
          </p>
          <Stagger as="ol" className="mt-4 grid gap-1.5" step={0.035}>
            {scored.map((r) => (
              <TopicRow key={r.t.slug} row={r} bank={bank} showSection />
            ))}
          </Stagger>
        </section>
        {rest.length > 0 && (
          <section className="rounded-[28px] bg-card p-4 sm:p-6">
            <Eyebrow className="px-2">Not enough answers yet</Eyebrow>
            <Stagger as="ul" className="mt-4 grid gap-1.5" step={0.03}>
              {rest.map((r) => (
                <TopicRow key={r.t.slug} row={r} bank={bank} showSection />
              ))}
            </Stagger>
          </section>
        )}
      </div>
    );
  }

  return (
    <Stagger className="mt-5 grid gap-5" step={0.06}>
      {bank.domains.map((d) => (
        <StaggerItem as="section" key={d.slug} aria-labelledby={`d-${d.slug}`} className="rounded-[28px] bg-card p-4 sm:p-6">
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[20px] px-5 py-4"
            style={{ background: sectionHl(d.slug) }}
          >
            <SectionChip domain={d.slug} className="size-3" />
            <h2 id={`d-${d.slug}`} className="text-xl font-semibold tracking-[-0.02em] text-ink">
              {d.title}
            </h2>
            <Badge value={d.badge} />
            <span className="ml-auto rounded-full bg-card/70 px-3 py-1 font-mono text-xs text-ink">{d.weight}% of the exam</span>
          </div>
          <p className="mt-3 max-w-[65ch] px-2 text-sm text-muted">{d.summary}</p>
          <Stagger as="ul" className="mt-3 grid gap-1.5" step={0.03}>
            {rows
              .filter((r) => r.t.domain === d.slug)
              .map((r) => (
                <TopicRow key={r.t.slug} row={r} bank={bank} showSection={false} />
              ))}
          </Stagger>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
