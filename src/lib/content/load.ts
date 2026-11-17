import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  ConfigEntrySchema,
  QuestionFileSchema,
  ResourcesFileSchema,
  SyllabusSchema,
  type ConfigEntry,
  type Question,
} from "./schema";

/** Build-time loaders for content/. Everything is parsed with Zod, so bad content fails the build. */

const CONTENT = join(process.cwd(), "content");

function readJson(name: string): unknown {
  return JSON.parse(readFileSync(join(CONTENT, name), "utf8"));
}

function optional(name: string, fallback: unknown): unknown {
  return existsSync(join(CONTENT, name)) ? readJson(name) : fallback;
}

let cache: ReturnType<typeof loadAll> | null = null;

function loadAll() {
  const syllabus = SyllabusSchema.parse(readJson("syllabus.json"));
  // questions/<section>/<area>.json
  const questions: Question[] = readdirSync(join(CONTENT, "questions"), { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".json"))
    .sort()
    .flatMap((f) => QuestionFileSchema.parse(readJson(join("questions", f))));
  const configs: ConfigEntry[] = z.array(ConfigEntrySchema).parse(optional("configs.json", []));
  const resources = ResourcesFileSchema.parse(optional("resources.json", { resources: [] }));
  const notes = new Set(
    readdirSync(join(CONTENT, "topics"))
      .filter((f) => f.endsWith(".mdx"))
      .map((f) => f.replace(/\.mdx$/, "")),
  );
  return { ...syllabus, questions, configs, resources: resources.resources, examReports: resources.examReports, notes };
}

export function content() {
  // Re-read in dev so content edits show up; cache for the production build.
  if (!cache || process.env.NODE_ENV === "development") cache = loadAll();
  return cache;
}
