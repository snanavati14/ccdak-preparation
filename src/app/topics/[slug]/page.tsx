import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/badge";
import { SectionChip } from "@/components/marks";
import { LinkButton } from "@/components/kit";
import { Reveal, Stagger, StaggerItem } from "@/components/motion";
import { TrustLabel } from "@/components/trust-label";
import { content } from "@/lib/content/load";
import { TopicMastery } from "./topic-mastery";

export const dynamicParams = false;

export function generateStaticParams() {
  return content().topics.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const t = content().topics.find((x) => x.slug === slug);
  return { title: t?.title ?? "Topic", description: t?.summary };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = content();
  const topic = c.topics.find((t) => t.slug === slug);
  if (!topic) notFound();
  const domain = c.domains.find((d) => d.slug === topic.domain)!;
  const Notes = c.notes.has(slug) ? (await import(`../../../../content/topics/${slug}.mdx`)).default : null;
  const configs = topic.keyConfigs.flatMap((name) => {
    const all = c.configs.filter((x) => x.name === name);
    // Prefer the client-side entry when a name exists in several scopes.
    return all.length ? [all.find((x) => ["producer", "consumer", "streams", "connect"].includes(x.scope)) ?? all[0]] : [];
  });
  const links = c.resources.filter((r) => r.topics.includes(slug));
  const questionCount = c.questions.filter((q) => q.topics.includes(slug)).length;

  return (
    <article className="max-w-3xl">
      <Reveal>
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <Link href="/topics/" className="rounded-full bg-card px-3.5 py-1.5 text-ink no-underline transition-colors hover:bg-panel-hover">
            Topics
          </Link>
          <span aria-hidden>/</span>
          <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-ink" style={{ background: `var(--hl-${domain.slug})` }}>
            <SectionChip domain={domain.slug} />
            {domain.title} · <span className="font-mono text-xs">{domain.weight}%</span>
          </span>
        </nav>
        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em]">{topic.title}</h1>
      </Reveal>

      <Stagger className="mt-6 grid gap-4" delay={0.05}>
        <StaggerItem className="rounded-[28px] bg-card p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <Badge value={topic.badge} />
            {topic.badgeNote && <span className="text-muted">{topic.badgeNote}</span>}
          </div>
          <p className="mt-4 max-w-[62ch] text-lg leading-relaxed">{topic.summary}</p>
          {topic.blueprint.length > 0 && (
            <div className="mt-5 max-w-[65ch] rounded-[20px] bg-panel p-4 text-sm sm:p-5">
              <p className="text-muted">
                In Confluent&apos;s exam guide under {domain.title}, {domain.weight}% of the exam:
              </p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                {topic.blueprint.map((line) => (
                  <li key={line}>&ldquo;{line}&rdquo;</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
            {questionCount > 0 && (
              <LinkButton href={`/practice/?topic=${slug}&size=${Math.min(20, questionCount >= 20 ? 20 : 10)}`} size="lg" arrow>
                Drill this topic
              </LinkButton>
            )}
            <TopicMastery slug={slug} questionCount={questionCount} />
          </div>
        </StaggerItem>

        <StaggerItem className="rounded-[28px] bg-card p-6 sm:p-8">
          <div className="notes [&>:first-child]:mt-0">
            {Notes ? <Notes /> : <p className="text-muted">Notes for this topic haven&apos;t been written yet.</p>}
          </div>
        </StaggerItem>

        {configs.length > 0 && (
          <StaggerItem as="section" aria-labelledby="key-configs" className="rounded-[28px] bg-card p-5 sm:p-8">
            <h2 id="key-configs" className="text-xl font-semibold tracking-[-0.02em]">
              Key configs
            </h2>
            <ul className="mt-4 grid gap-1.5 text-sm">
              {configs.map((cfg) => (
                <li
                  key={`${cfg.scope}-${cfg.name}`}
                  className="grid gap-x-4 gap-y-1 rounded-[20px] bg-panel px-4 py-3 sm:grid-cols-[minmax(12rem,auto)_auto_1fr]"
                >
                  <span>
                    <Link href={`/configs/?q=${encodeURIComponent(cfg.name)}`} className="font-mono text-[0.8125rem] text-ink">
                      {cfg.name}
                    </Link>
                    <span className="block text-xs text-muted">{cfg.scope}</span>
                  </span>
                  <span className="self-start">
                    <span className="sr-only">Default </span>
                    <code className="rounded-full bg-card px-2.5 py-0.5 font-mono text-xs">{cfg.default}</code>
                  </span>
                  <span className="text-muted">
                    {cfg.meaning}
                    {cfg.versionNote && <span className="mt-1 block text-xs text-caution">{cfg.versionNote}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </StaggerItem>
        )}

        {links.length > 0 && (
          <StaggerItem as="section" aria-labelledby="links" className="rounded-[28px] bg-card p-5 sm:p-8">
            <h2 id="links" className="text-xl font-semibold tracking-[-0.02em]">
              Curated links
            </h2>
            <ul className="mt-4 grid gap-1.5">
              {links.map((r) => (
                <li key={r.url} className="rounded-[20px] bg-panel px-4 py-3 transition-transform duration-200 hover:-translate-y-0.5">
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <a href={r.url} target="_blank" rel="noreferrer" className="font-semibold text-ink">
                      {r.title}
                    </a>
                    <TrustLabel trust={r.trust} />
                  </span>
                  <p className="mt-1 max-w-[65ch] text-sm text-muted">{r.note}</p>
                </li>
              ))}
            </ul>
          </StaggerItem>
        )}
      </Stagger>
    </article>
  );
}
