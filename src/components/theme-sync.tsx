"use client";

import { useEffect, useSyncExternalStore } from "react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { updateSettings } from "@/lib/storage";
import { useProgress } from "@/lib/use-progress";

/**
 * Inline script for <head>: applies a saved light/dark choice before first
 * paint so the page doesn't flash the wrong theme.
 */
export const themeBootScript = `try{var t=JSON.parse(localStorage.getItem("offset:progress")||"{}").settings?.theme;if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

/** Keeps <html data-theme> in step with the setting after it changes. */
export function ThemeSync() {
  const { theme } = useProgress().settings;
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") delete root.dataset.theme;
    else root.dataset.theme = theme;
  }, [theme]);
  return null;
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribeScheme(cb: () => void) {
  const mq = window.matchMedia(DARK_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** The theme actually on screen: the saved choice, or the device's when it's "system". */
export function useResolvedTheme(): "light" | "dark" {
  const { theme } = useProgress().settings;
  const deviceDark = useSyncExternalStore(
    subscribeScheme,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  );
  if (theme === "light" || theme === "dark") return theme;
  return deviceDark ? "dark" : "light";
}

/** Nav toggle: flips light/dark with Magic UI's view transition and saves the choice. */
export function ThemeToggle({ className }: { className?: string }) {
  const resolved = useResolvedTheme();
  return (
    <AnimatedThemeToggler
      theme={resolved}
      duration={520}
      onThemeChange={(t) => {
        // Applied synchronously so the view transition snapshots the new theme.
        document.documentElement.dataset.theme = t;
        updateSettings({ theme: t });
      }}
      className={className}
    />
  );
}
