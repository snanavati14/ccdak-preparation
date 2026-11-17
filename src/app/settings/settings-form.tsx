"use client";

import { Alert, Button, Input, Label, Slider } from "@heroui/react";
import { Download, Upload } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Segmented } from "@/components/kit";
import { Collapse, Stagger, StaggerItem } from "@/components/motion";
import {
  canUndoImport,
  exportProgressJson,
  isStorageAvailable,
  lastActivity,
  parseProgressJson,
  replaceProgress,
  resetProgress,
  undoImport,
  updateSettings,
  type Progress,
  type Settings,
} from "@/lib/storage";
import { useHydrated, useProgress } from "@/lib/use-progress";

const THEMES: { value: Settings["theme"]; label: string }[] = [
  { value: "system", label: "Match system" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <StaggerItem as="section" className="grid gap-4 rounded-[28px] bg-card p-6 sm:grid-cols-[11rem_1fr] sm:gap-8 sm:p-8">
      <h2 className="text-lg font-semibold tracking-[-0.01em]">{title}</h2>
      <div className="min-w-0">{children}</div>
    </StaggerItem>
  );
}

const inputClass = "min-h-12 rounded-full bg-panel px-5 font-mono text-[0.9375rem] text-ink";

function describe(p: Progress) {
  const last = lastActivity(p);
  const when = last
    ? new Date(last).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "never";
  return `${p.log.length} ${p.log.length === 1 ? "answer" : "answers"}, last activity ${when}`;
}

export function SettingsForm() {
  const hydrated = useHydrated();
  const progress = useProgress();
  const { settings } = progress;
  const ids = { date: useId(), goal: useId(), file: useId() };
  const fileInput = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pendingImport, setPendingImport] = useState<{ name: string; progress: Progress } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [goalDraft, setGoalDraft] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  // Esc backs out of whichever confirmation is open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setConfirmReset(false);
      setPendingImport(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!hydrated) return <div className="min-h-96 rounded-[28px] bg-card" aria-busy="true" />;

  const answers = progress.log.length;

  function download() {
    const blob = new Blob([exportProgressJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `offset-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const result = parseProgressJson(await file.text());
    if (result.ok) {
      setImportMsg(null);
      setPendingImport({ name: file.name, progress: result.progress });
    } else {
      setPendingImport(null);
      setImportMsg({ ok: false, text: `${result.error} Nothing was changed.` });
    }
  }

  function confirmImport() {
    if (!pendingImport) return;
    replaceProgress(pendingImport.progress);
    setImportMsg({ ok: true, text: `Imported ${pendingImport.name}: ${describe(pendingImport.progress)}.` });
    setPendingImport(null);
  }

  function commitGoal() {
    if (goalDraft === null) return;
    const n = Math.round(Number(goalDraft));
    if (Number.isFinite(n) && n >= 5 && n <= 200) {
      updateSettings({ dailyGoal: n });
      setSaved(`Daily goal saved: ${n} questions.`);
    } else {
      setSaved(`Daily goal must be between 5 and 200, so it stays at ${settings.dailyGoal}.`);
    }
    setGoalDraft(null);
  }

  return (
    <Stagger className="grid gap-4">
      {!isStorageAvailable() && (
        <StaggerItem>
          <Alert status="warning" role="alert">
            <Alert.Content>
              <Alert.Description>
                This browser is blocking local storage, so progress won&apos;t survive a reload. Turn off private
                browsing or allow site data, or export before you close the tab.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        </StaggerItem>
      )}

      <Section title="Exam">
        <Label htmlFor={ids.date} className="block text-sm text-muted">
          Exam date
        </Label>
        <Input
          id={ids.date}
          type="date"
          className={inputClass + " mt-1"}
          value={settings.examDate}
          onChange={(e) => {
            if (!e.target.value) return;
            updateSettings({ examDate: e.target.value });
            setSaved("Exam date saved.");
          }}
        />

        <Label htmlFor={ids.goal} className="mt-6 block text-sm text-muted">
          Daily goal, in questions
        </Label>
        <Input
          id={ids.goal}
          type="number"
          inputMode="numeric"
          min={5}
          max={200}
          step={5}
          className={inputClass + " mt-1 w-32"}
          value={goalDraft ?? settings.dailyGoal}
          onChange={(e) => setGoalDraft(e.target.value)}
          onBlur={commitGoal}
          onKeyDown={(e) => e.key === "Enter" && commitGoal()}
        />
        <Slider
          aria-label="Daily goal slider"
          minValue={5}
          maxValue={200}
          step={5}
          className="mt-4 w-full max-w-sm"
          value={Number(goalDraft ?? settings.dailyGoal) || settings.dailyGoal}
          onChange={(v) => {
            const n = Array.isArray(v) ? v[0] : v;
            updateSettings({ dailyGoal: n });
            setGoalDraft(null);
            setSaved(`Daily goal saved: ${n} questions.`);
          }}
        >
          <Slider.Track className="h-3 rounded-full bg-panel">
            <Slider.Fill className="rounded-full bg-ink" />
            <Slider.Thumb className="size-7 rounded-full bg-card shadow-float ring-2 ring-ink" />
          </Slider.Track>
        </Slider>
        <p className="mt-1 text-sm text-muted">Between 5 and 200. Reviews due count toward it.</p>
        <p role="status" className="mt-3 min-h-[1.5em] text-sm text-ink">
          {saved && <span className="inline-block rounded-full bg-correct-soft px-3 py-1 text-correct">{saved}</span>}
        </p>
      </Section>

      <Section title="Appearance">
        <Segmented
          label="Theme"
          value={settings.theme}
          onChange={(v) => updateSettings({ theme: v })}
          options={THEMES.map((t) => ({ value: t.value, label: t.label }))}
        />
      </Section>

      <Section title="Progress">
        <p className="max-w-[60ch] text-sm text-muted">
          Progress is stored only in this browser ({answers} {answers === 1 ? "answer" : "answers"} logged). To move
          between laptop and phone, export here and import on the other device. Importing replaces what this
          device has.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="tertiary" onPress={download}>
            <Download aria-hidden className="size-4" />
            Export progress
          </Button>
          <Button variant="tertiary" onPress={() => fileInput.current?.click()}>
            <Upload aria-hidden className="size-4" />
            Import progress
          </Button>
          <input
            ref={fileInput}
            id={ids.file}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            tabIndex={-1}
            aria-label="Progress file to import"
            onChange={onImport}
          />
        </div>
        <Collapse open={!!pendingImport}>
        {pendingImport && (
          <div className="mt-4 max-w-[60ch] rounded-[20px] bg-panel p-5 text-sm">
            <p className="font-semibold">Replace this device&apos;s progress?</p>
            <dl className="mt-2 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-1">
              <dt className="text-muted">File</dt>
              <dd>{describe(pendingImport.progress)}</dd>
              <dt className="text-muted">This device</dt>
              <dd>{describe(progress)}</dd>
            </dl>
            {(pendingImport.progress.log.length < answers ||
              (lastActivity(pendingImport.progress) ?? 0) < (lastActivity(progress) ?? 0)) && (
              <Alert status="warning" role="alert" className="mt-3">
                <Alert.Content>
                  <Alert.Description>
                    The file has less or older progress than this device. Importing it would lose the newer answers here.
                  </Alert.Description>
                </Alert.Content>
              </Alert>
            )}
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onPress={confirmImport}>Replace this device</Button>
              <Button variant="tertiary" className="bg-card" onPress={() => setPendingImport(null)} autoFocus>
                Keep this device
              </Button>
            </div>
          </div>
        )}
        </Collapse>
        <p role={importMsg?.ok === false ? "alert" : "status"} className={"mt-3 text-sm " + (importMsg?.ok === false ? "text-wrong" : "text-ink")}>
          {importMsg?.text}
          {importMsg?.ok && canUndoImport() && (
            <>
              {" "}
              <button
                type="button"
                className="cursor-pointer font-semibold underline"
                onClick={() => {
                  undoImport();
                  setImportMsg({ ok: true, text: "Import undone. This device has its previous progress back." });
                }}
              >
                Undo import
              </button>
            </>
          )}
        </p>
      </Section>

      <Section title="Reset">
        {answers === 0 && progress.flags.length === 0 && progress.exams.length === 0 ? (
          <p className="text-sm text-muted">Nothing to reset yet. Answers, flags, and mock exams will appear here.</p>
        ) : !confirmReset ? (
          <Button variant="danger-soft" onPress={() => setConfirmReset(true)}>
            Reset progress
          </Button>
        ) : (
          <div className="rounded-[20px] bg-wrong-soft p-5">
            <p className="text-sm">
              This deletes {answers} logged {answers === 1 ? "answer" : "answers"}, your review schedule, flags, and mock
              exam results on this device. Settings stay. Export first if you might want them back.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Button
                variant="danger"
                onPress={() => {
                  resetProgress();
                  setConfirmReset(false);
                }}
              >
                Delete progress
              </Button>
              <Button variant="tertiary" className="bg-card" onPress={() => setConfirmReset(false)} autoFocus>
                Keep it
              </Button>
            </div>
          </div>
        )}
      </Section>
    </Stagger>
  );
}
