import type { Metadata } from "next";
import { Suspense } from "react";
import { PracticeApp } from "./practice-app";

export const metadata: Metadata = { title: "Practice" };

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-96" aria-busy="true" />}>
      <PracticeApp />
    </Suspense>
  );
}
