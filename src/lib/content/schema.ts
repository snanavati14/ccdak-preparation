import { z } from "zod";

/**
 * Zod schemas for everything under content/. Shared by the app (build-time
 * loading) and scripts/validate.ts, so a file that validates also renders.
 */

/** The six sections of Confluent's CCDAK exam guide (April 2025, still current in November 2026). */
export const DOMAIN_SLUGS = ["fundamentals", "app-development", "streams", "connect", "testing", "observability"] as const;
export const DomainSlug = z.enum(DOMAIN_SLUGS);
export type DomainSlug = z.infer<typeof DomainSlug>;

/** Confirmed / Likely / Unsure: how sure we are the exam tests it. */
export const Badge = z.enum(["confirmed", "likely", "unsure"]);
export type Badge = z.infer<typeof Badge>;

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "expected kebab-case slug");
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const url = z.url({ protocol: /^https$/ });

export const DomainSchema = z.object({
  slug: DomainSlug,
  title: z.string(),
  badge: Badge,
  /** Share of the exam in percent, as published in Confluent's exam guide. */
  weight: z.number().min(0).max(100),
  summary: z.string(),
});

export const TopicSchema = z.object({
  slug,
  title: z.string(),
  domain: DomainSlug,
  badge: Badge,
  summary: z.string(),
  /** Why the badge is what it is, shown next to it. */
  badgeNote: z.string().optional(),
  /** Lines from Confluent's exam guide that this topic covers, quoted as written there. */
  blueprint: z.array(z.string()).default([]),
  /** Config names (as in configs.json) shown in the topic's key-configs table. */
  keyConfigs: z.array(z.string()).default([]),
});

export const SyllabusSchema = z.object({
  domains: z.array(DomainSchema),
  topics: z.array(TopicSchema),
});

export const ReferenceKind = z.enum(["official", "book", "blog", "reddit", "stackoverflow", "medium", "github"]);

export const ReferenceSchema = z.object({
  title: z.string(),
  url,
  kind: ReferenceKind,
});

export const QuestionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*-\d{3}$/, "expected id like prod-acks-001"),
    domain: DomainSlug,
    topics: z.array(slug).min(1),
    type: z.enum(["single", "multi"]),
    stem: z.string().min(10),
    options: z.array(z.object({ id: z.string().regex(/^[a-f]$/), text: z.string().min(1) })).min(2).max(6),
    correct: z.array(z.string()).min(1),
    explanation: z.string().min(40),
    references: z.array(ReferenceSchema).min(1),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    confidence: z.enum(["verified", "likely", "unsure"]),
    source: z.union([
      z.literal("original"),
      z.object({ repo: z.string(), license: z.string(), url }),
    ]),
    kafkaVersionNote: z.string().optional(),
  })
  .superRefine((q, ctx) => {
    const ids = new Set(q.options.map((o) => o.id));
    if (ids.size !== q.options.length) ctx.addIssue({ code: "custom", message: "duplicate option ids" });
    for (const c of q.correct) {
      if (!ids.has(c)) ctx.addIssue({ code: "custom", path: ["correct"], message: `correct id "${c}" is not an option` });
    }
    if (new Set(q.correct).size !== q.correct.length) {
      ctx.addIssue({ code: "custom", path: ["correct"], message: "duplicate correct ids" });
    }
    if (q.type === "single" && q.correct.length !== 1) {
      ctx.addIssue({ code: "custom", path: ["correct"], message: "single-answer question needs exactly one correct id" });
    }
    if (q.type === "multi" && q.correct.length < 2) {
      ctx.addIssue({ code: "custom", path: ["correct"], message: "multi-response question needs two or more correct ids" });
    }
    if (q.references[0]?.kind !== "official") {
      ctx.addIssue({ code: "custom", path: ["references", 0], message: "first reference must be official docs" });
    }
    if (q.confidence === "unsure" && !q.kafkaVersionNote) {
      ctx.addIssue({ code: "custom", path: ["kafkaVersionNote"], message: "unsure questions must explain why" });
    }
  });

export const QuestionFileSchema = z.array(QuestionSchema);

export const ConfigEntrySchema = z.object({
  name: z.string(),
  /** Which client or component owns it. */
  scope: z.enum(["producer", "consumer", "topic", "broker", "streams", "connect", "schema-registry", "admin"]),
  default: z.string(),
  values: z.string(),
  meaning: z.string(),
  interactsWith: z.array(z.string()).default([]),
  topics: z.array(slug).default([]),
  /** Official config reference, ideally with the per-config anchor. */
  url,
  versionNote: z.string().optional(),
});

export const ResourceSchema = z.object({
  title: z.string(),
  url,
  kind: ReferenceKind.or(z.enum(["course", "forum", "practice"])),
  topics: z.array(slug).default([]),
  trust: z.enum(["official", "high", "community", "caution"]),
  note: z.string(),
  lastVerified: isoDate,
  /** Which group it is listed under on /resources. */
  group: z.enum(["exam", "official-docs", "courses", "books", "practice", "stackoverflow", "articles", "reddit", "repos"]),
});

export const ExamThemeSchema = z.object({
  theme: z.string(),
  detail: z.string(),
  sources: z.array(url).min(1),
});

export const ResourcesFileSchema = z.object({
  resources: z.array(ResourceSchema),
  /** Recurring themes from people reporting on their CCDAK, in our words. */
  examReports: z.array(ExamThemeSchema).default([]),
});

/** One entry per URL that scripts/verify-links.ts fetched. */
export const LinkCheckSchema = z.record(
  z.string(),
  z.object({
    status: z.number(),
    ok: z.boolean(),
    title: z.string(),
    anchorFound: z.boolean().nullable(),
    lastVerified: isoDate,
    note: z.string().optional(),
  }),
);

export type Domain = z.infer<typeof DomainSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type ConfigEntry = z.infer<typeof ConfigEntrySchema>;
export type Resource = z.infer<typeof ResourceSchema>;
export type ExamTheme = z.infer<typeof ExamThemeSchema>;
