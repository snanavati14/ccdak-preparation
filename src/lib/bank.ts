"use client";

import { useEffect, useState } from "react";
import type { ConfigEntry, Domain, DomainSlug, Question, Topic } from "./content/schema";

/** The question bank as the browser sees it: one static file, fetched once per page load. */
export type BankTopic = Topic & { hasNotes: boolean };
export type BankConfig = Pick<ConfigEntry, "name" | "scope" | "default" | "meaning" | "url">;
export type Bank = {
  domains: Domain[];
  topics: BankTopic[];
  questions: Question[];
  configs: BankConfig[];
};

export type BankIndex = Bank & {
  byId: Map<string, Question>;
  topicBySlug: Map<string, BankTopic>;
  domainBySlug: Map<DomainSlug, Domain>;
};

let pending: Promise<BankIndex> | null = null;

function index(bank: Bank): BankIndex {
  return {
    ...bank,
    byId: new Map(bank.questions.map((q) => [q.id, q])),
    topicBySlug: new Map(bank.topics.map((t) => [t.slug, t])),
    domainBySlug: new Map(bank.domains.map((d) => [d.slug, d])),
  };
}

export function loadBank(): Promise<BankIndex> {
  pending ??= fetch(`${process.env.NEXT_PUBLIC_BASE_PATH}/bank.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<Bank>;
    })
    .then(index)
    .catch((err) => {
      pending = null; // allow a retry
      throw err;
    });
  return pending;
}

export type BankState = { status: "loading" } | { status: "error"; error: string } | { status: "ready"; bank: BankIndex };

export function useBank(): BankState {
  const [state, setState] = useState<BankState>({ status: "loading" });
  useEffect(() => {
    let live = true;
    loadBank().then(
      (bank) => live && setState({ status: "ready", bank }),
      (err: Error) => live && setState({ status: "error", error: err.message }),
    );
    return () => {
      live = false;
    };
  }, []);
  return state;
}

/** Configs mentioned in backticks in a question, for the explain-first panel. */
export function configsFor(q: Question, bank: BankIndex): BankConfig[] {
  const text = `${q.stem}\n${q.explanation}`;
  const named = new Set([...text.matchAll(/`([a-z][a-z0-9_.-]*\.[a-z0-9_.-]+)(?:=[^`]*)?`/g)].map((m) => m[1]));
  const seen = new Set<string>();
  const scopeOrder = ["producer", "consumer", "topic", "broker", "streams", "connect", "schema-registry", "admin"];
  return bank.configs
    .filter((c) => named.has(c.name))
    .sort((a, b) => scopeOrder.indexOf(a.scope) - scopeOrder.indexOf(b.scope))
    .filter((c) => (seen.has(c.name) ? false : (seen.add(c.name), true)))
    .slice(0, 4);
}
