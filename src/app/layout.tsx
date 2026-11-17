import type { Metadata, Viewport } from "next";
import { Geist, Martian_Mono } from "next/font/google";
import { MotionProvider } from "@/components/motion-provider";
import { SiteNav } from "@/components/site-nav";
import { ThemeSync, themeBootScript } from "@/components/theme-sync";
import "./globals.css";

const text = Geist({
  variable: "--font-text",
  subsets: ["latin"],
  display: "swap",
});

const code = Martian_Mono({
  variable: "--font-code",
  subsets: ["latin"],
  display: "swap",
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: { default: "Offset", template: "%s · Offset" },
  description: "Personal CCDAK exam prep: practice, spaced review, mock exams, and verified Kafka notes.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f2ef" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1a19" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${text.variable} ${code.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-5 focus:py-2.5 focus:font-semibold focus:text-on-ink"
        >
          Skip to content
        </a>
        <MotionProvider>
          <ThemeSync />
          <SiteNav />
          <main id="main" className="mx-auto w-full max-w-[90rem] flex-1 px-4 pb-24 pt-6 sm:px-8 lg:px-12 lg:pt-10">
            {children}
          </main>
        </MotionProvider>
      </body>
    </html>
  );
}
