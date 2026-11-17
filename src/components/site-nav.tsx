"use client";

import { Button } from "@heroui/react";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFocusMode } from "@/lib/focus-mode";
import { cn } from "@/lib/utils";
import { SNAPPY, SPRING } from "./motion";
import { ThemeToggle } from "./theme-sync";

const PRIMARY = [
  { href: "/", label: "Today" },
  { href: "/practice", label: "Practice" },
  { href: "/review", label: "Review" },
  { href: "/exam", label: "Mock exam" },
];

const SECONDARY = [
  { href: "/topics", label: "Topics" },
  { href: "/configs", label: "Configs" },
  { href: "/resources", label: "Resources" },
  { href: "/settings", label: "Settings" },
];

function isActive(pathname: string, href: string) {
  const path = pathname.replace(/\/$/, "") || "/";
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

/** Desktop tab: the current page sits on a black pill that glides between tabs. */
function Tab({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative isolate flex min-h-11 items-center rounded-full px-4 text-[0.9375rem] font-medium no-underline transition-colors duration-200 active:scale-[0.97] xl:px-5",
        active ? "text-on-ink" : "text-muted hover:text-ink",
      )}
    >
      {active && <motion.span layoutId="nav-pill" transition={SNAPPY} className="absolute inset-0 -z-10 rounded-full bg-ink" />}
      {label}
    </Link>
  );
}

function MenuLink({ href, label, pathname, i }: { href: string; label: string; pathname: string; i: number }) {
  const active = isActive(pathname, href);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: 0.03 * i }}
    >
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-12 items-center rounded-full px-5 font-medium no-underline transition-colors active:scale-[0.98]",
          active ? "bg-ink text-on-ink" : "bg-panel text-ink hover:bg-panel-hover",
        )}
      >
        {label}
      </Link>
    </motion.div>
  );
}

function Brand() {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-2.5 rounded-full text-[1.375rem] font-semibold tracking-[-0.03em] text-ink no-underline"
    >
      <span aria-hidden className="grid size-9 place-items-center rounded-full bg-ink">
        <span className="size-3 rounded-full bg-[var(--chip-app-development)]" />
      </span>
      Offset
    </Link>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  // The phone menu stays open only on the page it was opened from, so it closes after navigating.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const button = useRef<HTMLButtonElement>(null);
  const focus = useFocusMode();
  const [engaged, setEngaged] = useState(false);
  const dim = focus && !engaged && !open;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpenOn(null);
      button.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <motion.header
      className="sticky top-0 z-40 bg-canvas/85 backdrop-blur-md"
      animate={{ opacity: dim ? 0.45 : 1 }}
      transition={{ duration: dim ? 0.6 : 0.2, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setEngaged(true)}
      onHoverEnd={() => setEngaged(false)}
      onFocusCapture={() => setEngaged(true)}
      onBlurCapture={() => setEngaged(false)}
    >
      <div className="mx-auto flex h-[var(--nav-h)] max-w-[90rem] items-center gap-4 px-4 sm:px-8 lg:px-12">
        <Brand />

        <nav aria-label="Main" className="mx-auto hidden items-center gap-2 lg:flex">
          <div className="flex items-center gap-0.5 rounded-full bg-card p-1 shadow-float">
            {PRIMARY.map((l) => (
              <Tab key={l.href} {...l} pathname={pathname} />
            ))}
          </div>
          <div className="flex items-center gap-0.5 rounded-full bg-card p-1 shadow-float">
            {SECONDARY.map((l) => (
              <Tab key={l.href} {...l} pathname={pathname} />
            ))}
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <ThemeToggle className="grid size-11 cursor-pointer place-items-center rounded-full bg-card text-ink shadow-float transition-transform duration-200 hover:-translate-y-px active:scale-95 [&_svg]:size-[18px]" />
          <Button
            ref={button}
            variant="primary"
            className="lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onPress={() => setOpenOn(open ? null : pathname)}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={open ? "x" : "m"}
                initial={{ rotate: -45, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 45, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="grid place-items-center"
              >
                {open ? <X aria-hidden className="size-4" /> : <Menu aria-hidden className="size-4" />}
              </motion.span>
            </AnimatePresence>
            {open ? "Close" : "Menu"}
          </Button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.nav
            id="mobile-nav"
            aria-label="Main"
            className="px-4 pb-4 sm:px-8 lg:hidden"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={SPRING}
          >
            <div className="grid grid-cols-2 gap-x-3 rounded-[28px] bg-card p-4 shadow-float">
              <div className="grid content-start gap-1.5">
                <p className="px-2 pb-1 text-xs font-semibold text-muted">Study</p>
                {PRIMARY.map((l, i) => (
                  <MenuLink key={l.href} {...l} pathname={pathname} i={i} />
                ))}
              </div>
              <div className="grid content-start gap-1.5">
                <p className="px-2 pb-1 text-xs font-semibold text-muted">Reference</p>
                {SECONDARY.map((l, i) => (
                  <MenuLink key={l.href} {...l} pathname={pathname} i={i + 1} />
                ))}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
