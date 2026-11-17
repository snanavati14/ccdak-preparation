import type { Metadata } from "next";
import { ReviewApp } from "./review-app";

export const metadata: Metadata = { title: "Review" };

export default function Page() {
  return <ReviewApp />;
}
