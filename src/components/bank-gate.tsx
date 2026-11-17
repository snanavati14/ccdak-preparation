"use client";

import { Alert, Skeleton } from "@heroui/react";
import type { ReactNode } from "react";
import { useBank, type BankIndex } from "@/lib/bank";
import { useHydrated } from "@/lib/use-progress";

/** Renders children once the question bank has loaded (and we're in the browser). */
export function BankGate({ children, compact = false }: { children: (bank: BankIndex) => ReactNode; compact?: boolean }) {
  const hydrated = useHydrated();
  const state = useBank();
  if ((!hydrated || state.status === "loading") && compact)
    return <Skeleton aria-busy="true" className="h-11 min-w-56 flex-1 rounded-full" />;
  if (!hydrated || state.status === "loading")
    return (
      <div className="grid min-h-96 content-start gap-4" aria-busy="true">
        <Skeleton className="h-40 rounded-[28px]" />
        <Skeleton className="h-24 rounded-[28px]" />
      </div>
    );
  if (state.status === "error") {
    return (
      <Alert status="danger" role="alert" className="max-w-[65ch]">
        <Alert.Content>
          <Alert.Description>
            The question bank didn&apos;t load ({state.error}). Check your connection and reload the page.
          </Alert.Description>
        </Alert.Content>
      </Alert>
    );
  }
  return <>{children(state.bank)}</>;
}
