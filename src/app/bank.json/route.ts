import { content } from "@/lib/content/load";
import type { Bank } from "@/lib/bank";

// The question bank ships as one static JSON file that practice, review, the
// mock exam and Today all fetch (and the browser caches), instead of being
// inlined into every page.
export const dynamic = "force-static";

export function GET() {
  const c = content();
  const bank: Bank = {
    domains: c.domains,
    topics: c.topics.map((t) => ({ ...t, hasNotes: c.notes.has(t.slug) })),
    questions: c.questions,
    configs: c.configs.map(({ name, scope, default: def, meaning, url }) => ({ name, scope, default: def, meaning, url })),
  };
  return Response.json(bank);
}
