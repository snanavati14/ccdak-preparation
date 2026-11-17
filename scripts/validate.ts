/**
 * npm run validate: checks all content against the Zod schemas plus the
 * cross-file rules the schemas can't see on their own.
 */
import { readFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import { z } from "zod";
import {
  ConfigEntrySchema,
  LinkCheckSchema,
  QuestionFileSchema,
  ResourcesFileSchema,
  SyllabusSchema,
  type Question,
} from "../src/lib/content/schema.ts";
import { CONTENT, collectUrls, optionalJson, questionFiles, readJson, topicFiles } from "./content-files.ts";

const errors: string[] = [];
const warnings: string[] = [];
const err = (where: string, msg: string) => errors.push(`${where}: ${msg}`);

function parse<T>(schema: z.ZodType<T>, data: unknown, where: string): T | undefined {
  const r = schema.safeParse(data);
  if (r.success) return r.data;
  for (const issue of r.error.issues.slice(0, 20)) err(where, `${issue.path.join(".") || "(root)"}: ${issue.message}`);
  return undefined;
}

// Syllabus --------------------------------------------------------------
const syllabus = parse(SyllabusSchema, readJson(`${CONTENT}/syllabus.json`), "syllabus.json");
const topicSlugs = new Set(syllabus?.topics.map((t) => t.slug));
const topicDomain = new Map(syllabus?.topics.map((t) => [t.slug, t.domain]));

// Questions -------------------------------------------------------------
const questions: Question[] = [];
for (const file of questionFiles()) {
  const name = `questions/${basename(dirname(file))}/${basename(file)}`;
  const parsed = parse(QuestionFileSchema, readJson(file), name);
  if (!parsed) continue;
  for (const q of parsed) {
    for (const t of q.topics) {
      if (!topicSlugs.has(t)) err(`${name} ${q.id}`, `unknown topic "${t}"`);
    }
    // The first topic decides which exam section a question counts towards.
    if (topicDomain.get(q.topics[0]) !== q.domain) {
      err(`${name} ${q.id}`, `first topic "${q.topics[0]}" is not in its domain "${q.domain}"`);
    }
    if (basename(dirname(file)) !== q.domain) err(`${name} ${q.id}`, `domain "${q.domain}" is in the wrong section folder`);
  }
  questions.push(...parsed);
}

const seenIds = new Map<string, number>();
const seenStems = new Map<string, string>();
const normalise = (s: string) => s.toLowerCase().replace(/[`*_]/g, "").replace(/\s+/g, " ").trim();
for (const q of questions) {
  seenIds.set(q.id, (seenIds.get(q.id) ?? 0) + 1);
  const key = normalise(q.stem);
  const dup = seenStems.get(key);
  if (dup) err(q.id, `duplicate stem (same as ${dup})`);
  else seenStems.set(key, q.id);
}
for (const [id, n] of seenIds) if (n > 1) err(id, `id used ${n} times`);

// Configs, resources, topic notes --------------------------------------
const configs = parse(z.array(ConfigEntrySchema), optionalJson("configs.json") ?? [], "configs.json") ?? [];
const configNames = new Set(configs.map((c) => `${c.scope}:${c.name}`));
const configByName = new Set(configs.map((c) => c.name));
if (configNames.size !== configs.length) err("configs.json", "duplicate config name within a scope");
for (const c of configs) {
  for (const i of c.interactsWith) if (!configByName.has(i)) warnings.push(`configs.json ${c.name}: interactsWith "${i}" has no entry`);
  for (const t of c.topics) if (!topicSlugs.has(t)) err(`configs.json ${c.name}`, `unknown topic "${t}"`);
}
for (const t of syllabus?.topics ?? []) {
  for (const k of t.keyConfigs) if (configs.length && !configByName.has(k)) warnings.push(`syllabus ${t.slug}: key config "${k}" has no entry`);
}

const resources = parse(ResourcesFileSchema, optionalJson("resources.json") ?? { resources: [] }, "resources.json");
for (const r of resources?.resources ?? []) {
  for (const t of r.topics) if (!topicSlugs.has(t)) err(`resources.json ${r.title}`, `unknown topic "${t}"`);
}
const BANNED = /examcollection|certmage|pdfvce|dumps|p2pexams|examtopics|braindump|passleader|vceplayer|itexams|actualtests/i;

const notes = new Set(topicFiles().map((f) => basename(f, ".mdx")));
for (const n of notes) if (!topicSlugs.has(n)) err(`topics/${n}.mdx`, "no matching topic in syllabus.json");
for (const f of topicFiles()) {
  const text = readFileSync(f, "utf8");
  if (/^#\s/m.test(text)) warnings.push(`topics/${basename(f)}: has an h1; the page supplies the title`);
}

// Links -----------------------------------------------------------------
// Scripted checks, plus hand checks for sites that block scripts (Reddit, Medium...).
const checks = {
  ...(parse(LinkCheckSchema, optionalJson("link-checks.json") ?? {}, "link-checks.json") ?? {}),
  ...(parse(LinkCheckSchema, optionalJson("link-checks-manual.json") ?? {}, "link-checks-manual.json") ?? {}),
};
let unverified = 0;
for (const [url, where] of collectUrls()) {
  if (BANNED.test(url)) err(where[0], `banned exam-dump domain: ${url}`);
  const c = checks[url];
  if (!c) {
    unverified++;
    err(where[0], `unverified link (run npm run verify-links): ${url}`);
  } else if (!c.ok) {
    err(where[0], `link failed verification (${c.status}${c.anchorFound === false ? ", anchor missing" : ""}): ${url}`);
  }
}

// Report ----------------------------------------------------------------
const byDomain = new Map<string, Question[]>();
for (const q of questions) byDomain.set(q.domain, [...(byDomain.get(q.domain) ?? []), q]);
const multi = questions.filter((q) => q.type === "multi").length;

// A 60-question mock takes each section's share of the exam weights. Three
// mocks' worth of questions per section keeps repeats down near exam day.
const MOCK = 60;
const totalWeight = (syllabus?.domains ?? []).reduce((s, d) => s + d.weight, 0) || 1;
console.log("Questions per exam section       bank   share  exam  mock  multi");
for (const d of syllabus?.domains ?? []) {
  const qs = byDomain.get(d.slug) ?? [];
  const unsure = qs.filter((q) => q.confidence === "unsure").length;
  const multiShare = qs.length ? qs.filter((q) => q.type === "multi").length / qs.length : 0;
  const share = questions.length ? Math.round((qs.length / questions.length) * 100) : 0;
  const quota = Math.round((d.weight / totalWeight) * MOCK);
  console.log(
    `  ${d.slug.padEnd(30)} ${String(qs.length).padStart(4)}  ${String(share).padStart(4)}%  ${String(d.weight).padStart(3)}%  ${String(quota).padStart(4)}  ${String(Math.round(multiShare * 100)).padStart(4)}%${unsure ? `  (${unsure} unsure)` : ""}`,
  );
  if (qs.length < quota * 3) warnings.push(`${d.slug}: ${qs.length} questions is under three mocks' worth (${quota * 3})`);
  if (qs.length && multiShare < 0.2) warnings.push(`${d.slug}: under 20% multi-response`);
}
const uncovered = [...topicSlugs].filter((t) => !questions.some((q) => q.topics.includes(t)));
console.log(
  `  ${"total".padEnd(20)} ${String(questions.length).padStart(4)}  multi-response ${multi} (${questions.length ? Math.round((multi / questions.length) * 100) : 0}%)`,
);
console.log(`Topic notes ${notes.size}/${topicSlugs.size} · configs ${configs.length} · resources ${resources?.resources.length ?? 0} · links on record ${Object.keys(checks).length}`);
if (uncovered.length) warnings.push(`topics with no questions: ${uncovered.join(", ")}`);
if (questions.length && multi / questions.length < 0.2) warnings.push("fewer than 20% multi-response questions");

for (const w of warnings) console.log(`warn  ${w}`);
for (const e of errors) console.log(`error ${e}`);
if (unverified) console.log(`\n${unverified} unverified link(s).`);
console.log(errors.length ? `\n${errors.length} error(s).` : "\nContent is valid.");
process.exit(errors.length ? 1 : 0);
