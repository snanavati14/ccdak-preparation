import { Fragment, type ReactNode } from "react";

/**
 * A deliberately small Markdown renderer for question stems, options and
 * explanations: paragraphs, lists, fenced code, `code`, **bold**, *em* and
 * links. Content is ours and goes through React elements, never innerHTML.
 */

const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_|\[[^\]]+\]\([^)\s]+\))/g;

function inline(text: string, key = ""): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const k = `${key}${i}`;
    if (!part) return null;
    if (part.startsWith("`")) return <code key={k} className="md-code">{part.slice(1, -1)}</code>;
    if (part.startsWith("**")) return <strong key={k}>{inline(part.slice(2, -2), k)}</strong>;
    if ((part.startsWith("*") || part.startsWith("_")) && part.length > 2) return <em key={k}>{inline(part.slice(1, -1), k)}</em>;
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      const external = /^https?:/.test(link[2]);
      return (
        <a key={k} href={link[2]} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
          {inline(link[1], k)}
        </a>
      );
    }
    return <Fragment key={k}>{part}</Fragment>;
  });
}

type Block =
  | { kind: "p"; text: string }
  | { kind: "code"; lang: string; text: string }
  | { kind: "ul" | "ol"; items: string[] };

function blocks(src: string): Block[] {
  const out: Block[] = [];
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  let para: string[] = [];
  const flush = () => {
    if (para.length) out.push({ kind: "p", text: para.join(" ") });
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^\s*```(\w*)\s*$/);
    if (fence) {
      flush();
      const body: string[] = [];
      for (i++; i < lines.length && !/^\s*```\s*$/.test(lines[i]); i++) body.push(lines[i]);
      out.push({ kind: "code", lang: fence[1], text: body.join("\n") });
      continue;
    }
    const li = line.match(/^\s*(?:([-*])|(\d+)[.)])\s+(.*)$/);
    if (li) {
      flush();
      const kind = li[1] ? "ul" : "ol";
      const last = out[out.length - 1];
      if (last && last.kind === kind) last.items.push(li[3]);
      else out.push({ kind, items: [li[3]] });
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    // A wrapped continuation of the previous list item.
    const last = out[out.length - 1];
    if (!para.length && last && (last.kind === "ul" || last.kind === "ol") && /^\s{2,}/.test(line)) {
      last.items[last.items.length - 1] += " " + line.trim();
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return out;
}

export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={"md " + className}>
      {blocks(children).map((b, i) => {
        if (b.kind === "code") {
          return (
            <pre key={i} className="md-pre" data-lang={b.lang || undefined}>
              <code>{b.text}</code>
            </pre>
          );
        }
        if (b.kind === "p") return <p key={i}>{inline(b.text, `${i}-`)}</p>;
        const List = b.kind;
        return (
          <List key={i}>
            {b.items.map((it, j) => (
              <li key={j}>{inline(it, `${i}-${j}-`)}</li>
            ))}
          </List>
        );
      })}
    </div>
  );
}

/** Inline-only rendering, for option text that must stay on one line of flow. */
export function InlineMarkdown({ children }: { children: string }) {
  return <>{inline(children)}</>;
}
