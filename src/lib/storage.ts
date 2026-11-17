import { z } from "zod";

/**
 * All learner progress lives in one localStorage key, behind this module.
 * Every read and write is wrapped: storage can be missing (private mode,
 * blocked site data) and the app must still render with defaults.
 */

export const SCHEMA_VERSION = 1;
const STORAGE_KEY = "offset:progress";
export const DEFAULT_EXAM_DATE = "2026-11-30";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const SettingsSchema = z.object({
  examDate: isoDate.default(DEFAULT_EXAM_DATE),
  dailyGoal: z.number().int().min(5).max(200).default(30),
  theme: z.enum(["system", "light", "dark"]).default("system"),
});

/** One answered question: a record in the learner's commit log. */
export const AnswerRecordSchema = z.object({
  offset: z.number().int().nonnegative(),
  questionId: z.string(),
  at: z.number(), // epoch ms
  correct: z.boolean(),
  chosen: z.array(z.string()),
  ms: z.number().nonnegative().optional(),
  mode: z.enum(["diagnostic", "practice", "review", "exam"]),
});

/** Spaced-repetition card state (SM-2). */
export const CardSchema = z.object({
  ease: z.number(),
  interval: z.number(), // days
  reps: z.number().int(),
  lapses: z.number().int(),
  due: z.number(), // epoch ms
});

export const ExamResultSchema = z.object({
  id: z.string(),
  startedAt: z.number(),
  finishedAt: z.number(),
  questionIds: z.array(z.string()),
  answers: z.record(z.string(), z.array(z.string())),
  msPerQuestion: z.record(z.string(), z.number()),
  score: z.number(),
});

/** A mock exam in progress, saved on every change so a reload doesn't lose it. */
export const ActiveExamSchema = z.object({
  id: z.string(),
  startedAt: z.number(),
  deadline: z.number(),
  questionIds: z.array(z.string()),
  answers: z.record(z.string(), z.array(z.string())),
  flags: z.array(z.string()),
  msPerQuestion: z.record(z.string(), z.number()),
  current: z.number().int().nonnegative(),
});

export const ProgressSchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  settings: SettingsSchema,
  log: z.array(AnswerRecordSchema),
  cards: z.record(z.string(), CardSchema),
  flags: z.array(z.string()),
  diagnosticDone: z.boolean(),
  exams: z.array(ExamResultSchema),
  activeExam: ActiveExamSchema.optional(),
});

export type Settings = z.infer<typeof SettingsSchema>;
export type AnswerRecord = z.infer<typeof AnswerRecordSchema>;
export type Card = z.infer<typeof CardSchema>;
export type ExamResult = z.infer<typeof ExamResultSchema>;
export type ActiveExam = z.infer<typeof ActiveExamSchema>;
export type Progress = z.infer<typeof ProgressSchema>;

export function defaultProgress(): Progress {
  return {
    version: SCHEMA_VERSION,
    settings: SettingsSchema.parse({}),
    log: [],
    cards: {},
    flags: [],
    diagnosticDone: false,
    exams: [],
  };
}

/**
 * Bring older saved shapes up to the current version. Each future schema bump
 * adds a step here; unknown or newer versions are rejected rather than guessed.
 */
function migrate(raw: unknown): Progress {
  if (typeof raw !== "object" || raw === null) throw new Error("Progress is not an object.");
  const version = (raw as { version?: unknown }).version;
  if (typeof version !== "number") throw new Error("Progress has no version number.");
  if (version > SCHEMA_VERSION) {
    throw new Error(
      `This file is from a newer version of Offset (schema ${version}); this copy reads schema ${SCHEMA_VERSION}.`,
    );
  }
  // version === 1: current. Steps for 1 → 2 and later go above this line.
  return ProgressSchema.parse(raw);
}

// ---------------------------------------------------------------------------
// In-memory snapshot + subscribers, so React can read progress with
// useSyncExternalStore and every screen updates after a write.

let snapshot: Progress | null = null;
let storageOk = true;
const listeners = new Set<() => void>();
const SERVER_SNAPSHOT = defaultProgress();

function readFromStorage(): Progress {
  try {
    const text = window.localStorage.getItem(STORAGE_KEY);
    if (!text) return defaultProgress();
    return migrate(JSON.parse(text));
  } catch (err) {
    // Corrupt or unreadable data: keep running on defaults, don't overwrite
    // the stored value until the learner saves something new.
    if (err instanceof DOMException) storageOk = false;
    console.warn("Offset: could not read saved progress, using defaults.", err);
    return defaultProgress();
  }
}

function writeToStorage(p: Progress) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    storageOk = true;
  } catch (err) {
    storageOk = false;
    console.warn("Offset: could not save progress.", err);
  }
}

export function getProgress(): Progress {
  if (typeof window === "undefined") return SERVER_SNAPSHOT;
  if (!snapshot) snapshot = readFromStorage();
  return snapshot;
}

export function getServerProgress(): Progress {
  return SERVER_SNAPSHOT;
}

/** False when the browser refused the last read or write (e.g. storage blocked). */
export function isStorageAvailable(): boolean {
  getProgress();
  return storageOk;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      snapshot = readFromStorage();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Apply an immutable update, persist it, and notify subscribers. */
export function updateProgress(fn: (p: Progress) => Progress): Progress {
  const next = fn(getProgress());
  snapshot = next;
  writeToStorage(next);
  listeners.forEach((l) => l());
  return next;
}

export function updateSettings(patch: Partial<Settings>) {
  return updateProgress((p) => ({ ...p, settings: { ...p.settings, ...patch } }));
}

export function resetProgress(keepSettings = true) {
  return updateProgress((p) => {
    const fresh = defaultProgress();
    return keepSettings ? { ...fresh, settings: p.settings } : fresh;
  });
}

// ---------------------------------------------------------------------------
// Export / import, for moving progress between laptop and phone.

export function exportProgressJson(): string {
  return JSON.stringify({ app: "offset", exportedAt: new Date().toISOString(), ...getProgress() }, null, 2);
}

export type ParsedImport = { ok: true; progress: Progress } | { ok: false; error: string };

/** Parse and validate an export file without touching stored progress. */
export function parseProgressJson(text: string): ParsedImport {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't an Offset export (it isn't valid JSON)." };
  }
  try {
    if (typeof raw === "object" && raw !== null) {
      // Drop the export envelope fields before validating.
      const rest = { ...(raw as Record<string, unknown>) };
      if (rest.app !== undefined && rest.app !== "offset") throw new Error("That file was exported by a different app.");
      delete rest.app;
      delete rest.exportedAt;
      raw = rest;
    }
    return { ok: true, progress: migrate(raw) };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const first = err.issues[0];
      return {
        ok: false,
        error: `That file isn't an Offset export. Details: ${first.path.join(".") || "root"}, ${first.message.toLowerCase()}.`,
      };
    }
    const msg = err instanceof Error ? err.message : "Import failed.";
    return { ok: false, error: msg.startsWith("Progress") ? `That file isn't an Offset export. ${msg}` : msg };
  }
}

let undoSnapshot: Progress | null = null;

/** Replace this device's progress with an imported copy; the old copy can be restored once. */
export function replaceProgress(next: Progress) {
  undoSnapshot = getProgress();
  updateProgress(() => next);
}

export function canUndoImport(): boolean {
  return undoSnapshot !== null;
}

export function undoImport() {
  if (!undoSnapshot) return;
  const prev = undoSnapshot;
  undoSnapshot = null;
  updateProgress(() => prev);
}

/** Last time anything was answered, for comparing two copies of progress. */
export function lastActivity(p: Progress): number | null {
  const last = p.log.at(-1)?.at;
  const exam = p.exams.at(-1)?.finishedAt;
  const times = [last, exam].filter((t): t is number => typeof t === "number");
  return times.length ? Math.max(...times) : null;
}
