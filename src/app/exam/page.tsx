import type { Metadata } from "next";
import { ExamApp } from "./exam-app";

export const metadata: Metadata = { title: "Mock exam" };

export default function Page() {
  return <ExamApp />;
}
