import type { Metadata } from "next";
import { PageHeader } from "@/components/kit";
import { Stagger, StaggerItem } from "@/components/motion";
import { TrustLabel } from "@/components/trust-label";
import { content } from "@/lib/content/load";
import type { Resource } from "@/lib/content/schema";

export const metadata: Metadata = { title: "Resources" };

const GROUPS: { id: Resource["group"]; title: string }[] = [
  { id: "exam", title: "The exam itself" },
  { id: "official-docs", title: "Official documentation" },
  { id: "courses", title: "Courses" },
  { id: "books", title: "Books" },
  { id: "practice", title: "Practice questions" },
  { id: "repos", title: "Question repos" },
  { id: "stackoverflow", title: "Stack Overflow answers" },
  { id: "articles", title: "Articles and blog posts" },
  { id: "reddit", title: "Exam reports from the community" },
];

export default function Page() {
  const c = content();
  const topics = new Map(c.topics.map((t) => [t.slug, t.title]));
  const verified = [...new Set(c.resources.map((r) => r.lastVerified))].sort().at(-1);

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Resources"
        lead={
          <>
            Every link here was opened and checked to be on topic{verified ? ` (last checked ${verified})` : ""}. Exam-dump
            sites are left out on purpose: they break Confluent&apos;s exam policy and are often wrong.
          </>
        }
      />

      <Stagger className="grid gap-4" step={0.06}>
        <StaggerItem as="section" aria-labelledby="format" className="rounded-[28px] bg-card p-5 sm:p-8">
          <h2 id="format" className="text-xl font-semibold tracking-[-0.02em]">
            What Confluent says about the exam
          </h2>
          <dl className="mt-4 grid gap-y-1.5 text-sm sm:grid-cols-[10rem_1fr]">
            {[
              ["Duration", "90 minutes, proctored, in English."],
              ["Price", "USD 150; complete it within 12 months of purchase."],
              [
                "Question types",
                "Multiple-choice, multiple-response, matching and build list (put steps in order). This app writes matching and build-list items as single-choice questions.",
              ],
              ["Questions", "Not published. Prep sources report about 55–60; the mock exam uses 60."],
              ["Pass mark", "Not published. Results appear on screen straight after the exam. This app aims for 70%."],
              [
                "Section weights",
                `${c.domains.map((d) => `${d.title} ${d.weight}%`).join(", ")}. From the exam guide dated April 2025, still the current version in November 2026. Its table adds up to 99%.`,
              ],
              [
                "Out of scope",
                "Confluent components (RBAC, ksqlDB, CFK), system-specific connectors, plugins and extensions, networking, administering and deploying Kafka itself, and infrastructure provisioning.",
              ],
              ["Validity", "Two years."],
            ].map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="pt-2.5 font-medium text-muted sm:rounded-l-[16px] sm:bg-panel sm:px-4 sm:py-2.5">{k}</dt>
                <dd className="rounded-[16px] bg-panel px-4 py-2.5 sm:rounded-l-none">{v}</dd>
              </div>
            ))}
          </dl>
        </StaggerItem>

        {c.examReports.length > 0 && (
          <StaggerItem as="section" aria-labelledby="reports" className="rounded-[28px] bg-card p-5 sm:p-8">
            <h2 id="reports" className="text-xl font-semibold tracking-[-0.02em]">
              What people say was on their exam
            </h2>
            <p className="mt-1 max-w-[65ch] text-sm text-muted">Recurring themes from people who sat the CCDAK, summarised in our words.</p>
            <ul className="mt-4 grid gap-1.5">
              {c.examReports.map((t) => (
                <li key={t.theme} className="rounded-[20px] bg-panel px-4 py-3.5">
                  <p className="font-semibold">{t.theme}</p>
                  <p className="mt-1 max-w-[65ch] text-sm">{t.detail}</p>
                  <p className="mt-2 flex flex-wrap gap-1.5 text-xs">
                    {t.sources.map((u, i) => (
                      <a
                        key={u}
                        href={u}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-card px-3 py-1 text-muted no-underline transition-colors hover:text-ink"
                      >
                        Source {i + 1}
                      </a>
                    ))}
                  </p>
                </li>
              ))}
            </ul>
          </StaggerItem>
        )}

        {GROUPS.map((g) => {
          const items = c.resources.filter((r) => r.group === g.id);
          if (!items.length) return null;
          return (
            <StaggerItem as="section" key={g.id} aria-labelledby={`g-${g.id}`} className="rounded-[28px] bg-card p-5 sm:p-8">
              <h2 id={`g-${g.id}`} className="text-xl font-semibold tracking-[-0.02em]">
                {g.title}
              </h2>
              <ul className="mt-4 grid gap-1.5">
                {items.map((r) => (
                  <li
                    key={r.url}
                    className="rounded-[20px] bg-panel px-4 py-3.5 transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <a href={r.url} target="_blank" rel="noreferrer" className="font-semibold text-ink">
                        {r.title}
                      </a>
                      <TrustLabel trust={r.trust} />
                    </div>
                    <p className={"mt-1 max-w-[65ch] text-sm " + (r.trust === "caution" ? "text-ink" : "text-muted")}>{r.note}</p>
                    {r.topics.length > 0 && (
                      <p className="mt-2 flex flex-wrap gap-1 text-xs text-muted">
                        {r.topics.map((t) => (
                          <span key={t} className="rounded-full bg-card px-2.5 py-0.5">
                            {topics.get(t) ?? t}
                          </span>
                        ))}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </StaggerItem>
          );
        })}
      </Stagger>
    </div>
  );
}
