import type { Metadata } from "next";
import { Suspense } from "react";
import { content } from "@/lib/content/load";
import { PageHeader } from "@/components/kit";
import { ConfigSearch } from "./config-search";

export const metadata: Metadata = { title: "Configs" };

export default function Page() {
  const c = content();
  const topics = Object.fromEntries(c.topics.map((t) => [t.slug, t.title]));
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Configs"
        lead="The settings the exam likes to ask about, with defaults copied from the Apache Kafka 4.4 and Confluent docs. Each name links to its official entry."
      />
      <Suspense fallback={<div className="min-h-96 rounded-[28px] bg-card" aria-busy="true" />}>
        <ConfigSearch configs={c.configs} topics={topics} />
      </Suspense>
    </div>
  );
}
