import type { Metadata } from "next";
import { PageHeader } from "@/components/kit";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" />
      <SettingsForm />
    </div>
  );
}
