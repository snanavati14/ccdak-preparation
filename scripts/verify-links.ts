/**
 * Fetches every URL in content/ once and records the result in
 * content/link-checks.json. Already-verified URLs are skipped unless --all.
 *
 *   npm run verify-links            # new URLs only
 *   npm run verify-links -- --all   # re-check everything
 *   node scripts/verify-links.ts --dry --only questions/producers.json
 *                                   # check one file's URLs, write nothing
 *
 * Sites that refuse scripted requests (403/429) can be verified by hand:
 * add the entry to content/link-checks-manual.json with ok: true and a note
 * saying how it was checked.
 */
import { writeFileSync, existsSync } from "node:fs";
import { LINK_CHECKS, collectUrls, readJson } from "./content-files.ts";

type Check = {
  status: number;
  ok: boolean;
  title: string;
  anchorFound: boolean | null;
  lastVerified: string;
  note?: string;
};

const all = process.argv.includes("--all");
const dry = process.argv.includes("--dry");
const onlyIdx = process.argv.indexOf("--only");
const only = onlyIdx > 0 ? process.argv[onlyIdx + 1] : undefined;
const checks: Record<string, Check> = existsSync(LINK_CHECKS) ? (readJson(LINK_CHECKS) as Record<string, Check>) : {};
const today = new Date().toISOString().slice(0, 10);
const urls = [...collectUrls()]
  .filter(([, where]) => !only || where.some((w) => w.includes(only)))
  .map(([u]) => u)
  .filter((u) => all || dry || !checks[u]?.ok);

const pages = new Map<string, Promise<{ status: number; html: string }>>();
function fetchPage(url: string) {
  if (!pages.has(url)) {
    pages.set(
      url,
      fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(30_000),
        headers: { "user-agent": "Mozilla/5.0 (offset link check)", accept: "text/html,*/*" },
      })
        .then(async (r) => ({ status: r.status, html: await r.text() }))
        .catch(() => ({ status: 0, html: "" })),
    );
  }
  return pages.get(url)!;
}

async function check(url: string): Promise<Check> {
  const [base, hash] = url.split("#");
  const { status, html } = await fetchPage(base);
  const title = (html.match(/<title[^>]*>([^<]*)/i)?.[1] ?? "").trim().replace(/\s+/g, " ");
  let anchorFound: boolean | null = null;
  if (hash) {
    const id = decodeURIComponent(hash).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    anchorFound = new RegExp(`(id|name)=["']?${id}["'\\s>]`).test(html);
  }
  const ok = status >= 200 && status < 300 && anchorFound !== false;
  return { status, ok, title, anchorFound, lastVerified: today };
}

let failed = 0;
const queue = [...urls];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      const prev = checks[url];
      const result = await check(url);
      // Keep a manual verification when the site simply blocks scripts.
      if (!result.ok && prev?.ok && prev.note && [0, 403, 429].includes(result.status)) continue;
      checks[url] = result;
      if (!result.ok) failed++;
      console.log(`${result.ok ? "ok  " : "FAIL"} ${result.status} ${result.anchorFound === false ? "(anchor missing) " : ""}${url}`);
    }
  }),
);

if (dry) {
  console.log(`\nChecked ${urls.length} URL(s), ${failed} failed. Dry run: nothing written.`);
  process.exit(failed ? 1 : 0);
}
const sorted = Object.fromEntries(Object.entries(checks).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(LINK_CHECKS, JSON.stringify(sorted, null, 2) + "\n");
console.log(`\nChecked ${urls.length} URL(s), ${failed} failed. ${Object.keys(sorted).length} on record.`);
