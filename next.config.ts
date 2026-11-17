import type { NextConfig } from "next";
import createMDX from "@next/mdx";

// GitHub Pages serves project sites under /<repo>; set BASE_PATH there.
const basePath = process.env.BASE_PATH || undefined;

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  // Client code fetches /bank.json, so it needs to know the prefix too.
  env: { NEXT_PUBLIC_BASE_PATH: basePath ?? "" },
  pageExtensions: ["ts", "tsx", "mdx"],
  images: { unoptimized: true },
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
};

// Plugins are named as strings so Turbopack can load them.
const withMDX = createMDX({
  options: {
    remarkPlugins: [["remark-gfm"]],
    rehypePlugins: [["rehype-slug"]],
  },
});

export default withMDX(nextConfig);
