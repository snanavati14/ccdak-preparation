"use client";

import { Accordion, Label, SearchField } from "@heroui/react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { Key } from "@/components/kit";
import { SPRING } from "@/components/motion";
import type { ConfigEntry } from "@/lib/content/schema";

type Scope = ConfigEntry["scope"];

/**
 * Fuzzy score: exact name beats prefix beats substring beats an in-order
 * subsequence of the name ("mir" → min.insync.replicas), then words in the
 * meaning. 0 means no match.
 */
function score(c: ConfigEntry, query: string): number {
  const q = query.toLowerCase().trim();
  if (!q) return 1;
  const name = c.name.toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 60;
  const compact = q.replace(/[\s.]+/g, "");
  let i = 0;
  for (const ch of name) if (ch === compact[i]) i++;
  if (i === compact.length) return 40 - Math.min(20, name.length - compact.length) / 2;
  const words = q.split(/\s+/).filter(Boolean);
  const hay = `${c.meaning} ${c.values} ${c.scope}`.toLowerCase();
  if (words.every((w) => hay.includes(w))) return 10;
  return 0;
}

const SCOPE_ORDER: Scope[] = ["producer", "consumer", "topic", "broker", "streams", "connect", "schema-registry", "admin"];
const SCOPE_TITLE: Record<Scope, string> = {
  producer: "Producer",
  consumer: "Consumer",
  topic: "Topic",
  broker: "Broker",
  streams: "Kafka Streams",
  connect: "Kafka Connect",
  "schema-registry": "Schema Registry",
  admin: "Admin client",
};

/** One config as an accordion item: name, default and meaning always show; the rest opens. */
function ConfigItem({ c, topics, search }: { c: ConfigEntry; topics: Record<string, string>; search: (q: string) => void }) {
  return (
    <Accordion.Item id={`${c.scope}:${c.name}`} className="rounded-[20px] bg-panel">
      <span id={`${c.scope}-${c.name}`} className="sr-only" />
      <Accordion.Heading>
        <Accordion.Trigger className="w-full items-start rounded-[20px] px-5 py-4 hover:bg-panel-hover">
          <span className="min-w-0 pr-3">
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="break-all font-mono text-[0.9375rem] font-medium text-ink">{c.name}</span>
              <code className="rounded-full bg-card px-2.5 py-0.5 font-mono text-xs text-ink">{c.default}</code>
            </span>
            <span className="mt-1.5 block max-w-[68ch] text-[0.9375rem] font-normal text-ink">{c.meaning}</span>
          </span>
          <Accordion.Indicator className="mt-1 shrink-0" />
        </Accordion.Trigger>
      </Accordion.Heading>
      <Accordion.Panel>
        <Accordion.Body className="px-5 pb-5">
          <dl className="grid gap-x-4 gap-y-2 rounded-[16px] bg-card p-4 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-muted">Values</dt>
            <dd className="max-w-[60ch]">{c.values}</dd>
            {c.interactsWith.length > 0 && (
              <>
                <dt className="text-muted">Interacts with</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {c.interactsWith.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => search(n)}
                      className="min-h-8 cursor-pointer rounded-full bg-panel px-3 font-mono text-xs transition-[background-color,transform] duration-200 hover:bg-panel-hover active:scale-95"
                    >
                      {n}
                    </button>
                  ))}
                </dd>
              </>
            )}
            {c.topics.length > 0 && (
              <>
                <dt className="text-muted">Topics</dt>
                <dd className="flex flex-wrap gap-x-3">
                  {c.topics.map((t) => (
                    <Link key={t} href={`/topics/${t}/`} className="text-ink">
                      {topics[t] ?? t}
                    </Link>
                  ))}
                </dd>
              </>
            )}
            <dt className="text-muted">Source</dt>
            <dd>
              <a href={c.url} target="_blank" rel="noreferrer" className="text-ink">
                Official docs entry
              </a>
            </dd>
          </dl>
          {c.versionNote && (
            <p role="note" className="mt-3 max-w-[68ch] rounded-[16px] bg-caution-soft px-4 py-3 text-sm text-caution">
              {c.versionNote}
            </p>
          )}
        </Accordion.Body>
      </Accordion.Panel>
    </Accordion.Item>
  );
}

export function ConfigSearch({ configs, topics }: { configs: ConfigEntry[]; topics: Record<string, string> }) {
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const deferred = useDeferredValue(query);
  const input = useRef<HTMLInputElement>(null);

  // "/" focuses search from anywhere, like most docs sites.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el === input.current || el?.tagName === "INPUT" || el?.tagName === "TEXTAREA") return;
      e.preventDefault();
      input.current?.focus();
      input.current?.select();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function search(q: string) {
    setQuery(q);
    router.replace(q ? `/configs/?q=${encodeURIComponent(q)}` : "/configs/", { scroll: false });
  }

  const results = configs
    .map((c) => ({ c, s: score(c, deferred) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.c.name.localeCompare(b.c.name));
  const scopes = [
    ...SCOPE_ORDER.filter((s) => configs.some((c) => c.scope === s)),
    ...[...new Set(configs.map((c) => c.scope))].filter((s) => !SCOPE_ORDER.includes(s)),
  ];
  const groups = scopes
    .map((s) => ({ scope: s, items: results.filter((r) => r.c.scope === s).map((r) => r.c) }))
    .filter((g) => g.items.length > 0);

  const autoOpen = results
    .filter((r) => results.length <= 3 || r.c.name.toLowerCase() === deferred.trim().toLowerCase())
    .map((r) => `${r.c.scope}:${r.c.name}`);

  return (
    <div>
      <div className="rounded-[28px] bg-card p-5 sm:p-7">
        <SearchField
          value={query}
          onChange={search}
          // The page exists to look something up, so the cursor starts in the search box.
          autoFocus
          className="w-full max-w-xl"
        >
          <Label className="block text-sm font-semibold">
            Search configs <Key className="ml-1">/</Key>
          </Label>
          <SearchField.Group className="mt-2 min-h-12 rounded-full bg-panel px-4">
            <SearchField.SearchIcon />
            <SearchField.Input
              id="config-q"
              ref={input}
              placeholder="acks, mir, rebalance, retention…"
              autoComplete="off"
              spellCheck={false}
              className="font-mono text-[0.9375rem] placeholder:font-sans"
            />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
        <p role="status" className="mt-3 text-sm text-muted">
          {results.length === configs.length ? `${configs.length} configs` : `${results.length} of ${configs.length} match`}
        </p>

        {groups.length > 0 && (
          <nav aria-label="Jump to scope" className="mt-4 flex flex-wrap gap-1.5">
            <AnimatePresence initial={false}>
              {groups.map((g) => (
                <motion.a
                  layout
                  key={g.scope}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={SPRING}
                  href={`#scope-${g.scope}`}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full bg-panel px-4 text-sm font-semibold text-ink no-underline transition-colors hover:bg-panel-hover"
                >
                  {SCOPE_TITLE[g.scope] ?? g.scope}
                  <span className="rounded-full bg-card px-2 py-0.5 font-mono text-[0.6875rem] font-normal text-muted">{g.items.length}</span>
                </motion.a>
              ))}
            </AnimatePresence>
          </nav>
        )}
      </div>

      {groups.map((g) => (
        <motion.section
          key={g.scope}
          id={`scope-${g.scope}`}
          aria-labelledby={`scope-h-${g.scope}`}
          className="mt-5 rounded-[28px] bg-card p-3 sm:p-5"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={SPRING}
        >
          <h2
            id={`scope-h-${g.scope}`}
            className="sticky top-[calc(var(--nav-h)+0.5rem)] z-10 mb-2 flex items-center justify-between rounded-full bg-ink py-2.5 pl-5 pr-2.5 text-lg font-semibold tracking-[-0.01em] text-on-ink shadow-float"
          >
            {SCOPE_TITLE[g.scope] ?? g.scope}
            <span className="rounded-full bg-on-ink/15 px-2.5 py-0.5 font-mono text-xs font-normal">{g.items.length}</span>
          </h2>
          <Accordion key={autoOpen.join("|")} allowsMultipleExpanded defaultExpandedKeys={autoOpen} className="grid gap-1.5">
            {g.items.map((c) => (
              <ConfigItem key={`${c.scope}:${c.name}`} c={c} topics={topics} search={search} />
            ))}
          </Accordion>
        </motion.section>
      ))}
      {results.length === 0 && (
        <p className="mt-5 rounded-[28px] bg-card p-6 text-muted">
          No config matches <span className="rounded-full bg-panel px-2 py-0.5 font-mono text-ink">{deferred}</span>. Try part of the name, or{" "}
          <button type="button" onClick={() => search("")} className="cursor-pointer font-semibold text-ink underline">
            clear the search
          </button>
          .
        </p>
      )}
    </div>
  );
}
