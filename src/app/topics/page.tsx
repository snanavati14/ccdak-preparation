import type { Metadata } from "next";
import { BADGE_EXPLAINED, Badge } from "@/components/badge";
import { PageHeader } from "@/components/kit";
import { Reveal } from "@/components/motion";
import { TopicsMap } from "./topics-map";

export const metadata: Metadata = { title: "Topics" };

export default function Page() {
  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Topics"
        lead={
          <>
            The syllabus, with your mastery per topic: a rolling accuracy that weights recent answers more. Once you have
            answers, the list puts the weakest first, weighted by how much of the exam each section is worth. The six
            sections and their weights come from Confluent&apos;s exam guide (April 2025, the current version); which
            topic sits in which section is our mapping, since the guide doesn&apos;t assign its tasks to sections.
          </>
        }
      />
      <Reveal delay={0.06} as="dl" className="grid gap-2 rounded-[28px] bg-card p-5 text-sm sm:grid-cols-[7rem_1fr] sm:gap-x-4 sm:p-6">
        {(["confirmed", "likely", "unsure"] as const).map((b) => (
          <div key={b} className="contents">
            <dt>
              <Badge value={b} />
            </dt>
            <dd className="pb-1 text-muted">{BADGE_EXPLAINED[b]}</dd>
          </div>
        ))}
      </Reveal>
      <TopicsMap />
    </div>
  );
}
