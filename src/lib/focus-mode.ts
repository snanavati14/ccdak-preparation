import { useSyncExternalStore } from "react";

/**
 * Practice focus mode: while a question is open and unanswered, the nav and
 * session chrome dim so only the question reads. One flag, shared by the
 * question card (writer) and the nav (reader).
 */
let focused = false;
const listeners = new Set<() => void>();

export function setFocusMode(on: boolean) {
  if (focused === on) return;
  focused = on;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useFocusMode(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => focused,
    () => false,
  );
}
