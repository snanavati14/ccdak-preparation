"use client";

import { useSyncExternalStore } from "react";
import { getProgress, getServerProgress, subscribe, type Progress } from "./storage";

/** Read learner progress; re-renders after any write, including from other tabs. */
export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getProgress, getServerProgress);
}

const noopSubscribe = () => () => {};

/** True once running in the browser, so screens can avoid flashing default values. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
