import type { MDXComponents } from "mdx/types";
import type { ReactNode } from "react";

/** A short aside in topic notes, for version changes and caveats. */
function Note({ children }: { children: ReactNode }) {
  return <aside className="rounded-[20px] bg-panel px-5 py-4 text-sm [&>p+p]:mt-2">{children}</aside>;
}

/** Wraps an inline SVG diagram with a caption. */
function Figure({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <figure className="figure my-6 rounded-[20px] bg-panel p-5">
      {children}
      <figcaption className="mt-3 text-sm text-muted">{caption}</figcaption>
    </figure>
  );
}

const components: MDXComponents = {
  Note,
  Figure,
  a: ({ href = "", children }) =>
    /^https?:/.test(href) ? (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    ) : (
      <a href={href}>{children}</a>
    ),
};

export function useMDXComponents(): MDXComponents {
  return components;
}
