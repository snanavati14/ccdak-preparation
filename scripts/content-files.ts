import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

/** Raw (unvalidated) reads of everything under content/, shared by the scripts. */

export const CONTENT = join(import.meta.dirname, "..", "content");
export const LINK_CHECKS = join(CONTENT, "link-checks.json");

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** questions/<section>/<area>.json: one folder per exam section, one file per subject area. */
export function questionFiles(): string[] {
  const dir = join(CONTENT, "questions");
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => join(dir, f));
}

export function topicFiles(): string[] {
  const dir = join(CONTENT, "topics");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".mdx"))
    .sort()
    .map((f) => join(dir, f));
}

export function optionalJson(name: string): unknown | undefined {
  const path = join(CONTENT, name);
  return existsSync(path) ? readJson(path) : undefined;
}

const URL_RE = /https:\/\/[^\s)"'<>\]`]+/g;

/** Every URL that appears anywhere in content/, with where it was found. */
export function collectUrls(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  const add = (url: string, where: string) => {
    const clean = url.replace(/[.,;:]+$/, "");
    found.set(clean, [...(found.get(clean) ?? []), where]);
  };
  const files = [
    ...questionFiles(),
    ...topicFiles(),
    join(CONTENT, "configs.json"),
    join(CONTENT, "resources.json"),
  ].filter((f) => existsSync(f));
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const m of text.matchAll(URL_RE)) add(m[0], file.slice(CONTENT.length + 1));
  }
  return found;
}
