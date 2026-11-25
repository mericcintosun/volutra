import { CORE_LOG } from "./log";
import { DoseClocksSchema, LocalTestsSchema, type LocalTest } from "./schemas";
import type { SpiralAnalysis } from "./tremor";

// The visitor's own diary lives in localStorage only. Nothing is sent to a server.
// This file is the single wrapper around localStorage: no other module touches it.
// Reads are checked with zod; a corrupt store is treated as empty (the step 5 fallback).

export type { LocalTest } from "./schemas";

export const LOCAL_DIARY_VERSION = "v1";

const TESTS_KEY = `volutra.local-tests.${LOCAL_DIARY_VERSION}`;
const DOSE_KEY = `volutra.dose-clock.${LOCAL_DIARY_VERSION}`;
const MAX_ENTRIES = 60;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function todayIso(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function readJson(key: string): unknown {
  const raw = window.localStorage.getItem(key);
  return raw ? JSON.parse(raw) : undefined;
}

export function readLocalTests(): LocalTest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = readJson(TESTS_KEY);
    if (raw === undefined) return [];
    const parsed = LocalTestsSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
  } catch {
    // fall through to the logged fallback
  }
  console.warn(`${CORE_LOG} local diary parse failure, starting empty`);
  return [];
}

/**
 * Save one reading, keyed by hashTrace(points). If a reading with the same key is already
 * stored (a double click, a second press), it is returned unchanged and nothing is written.
 */
export function saveLocalTestOnce(a: SpiralAnalysis, key: string): LocalTest {
  const current = readLocalTests();
  const existing = current.find((t) => t.key === key);
  if (existing) return existing;
  const now = new Date();
  const entry: LocalTest = {
    id: `local-${now.getTime()}`,
    key,
    day: todayIso(now),
    clock: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    peakHz: a.peakHz,
    amplitudeMm: a.amplitudeMm,
    sampleRateHz: a.sampleRateHz,
  };
  const next = [...current, entry].slice(-MAX_ENTRIES);
  window.localStorage.setItem(TESTS_KEY, JSON.stringify(next));
  return entry;
}

export function clearLocalTests(): void {
  window.localStorage.removeItem(TESTS_KEY);
}

/** Dose clock overrides, keyed by diary day. */
export function readDoseClocks(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = readJson(DOSE_KEY);
    if (raw === undefined) return {};
    const parsed = DoseClocksSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
  } catch {
    // fall through to the logged fallback
  }
  console.warn(`${CORE_LOG} local diary parse failure, starting empty`);
  return {};
}

export function writeDoseClock(day: string, clock: string): void {
  const next = { ...readDoseClocks(), [day]: clock };
  window.localStorage.setItem(DOSE_KEY, JSON.stringify(next));
}

export function clearDoseClocks(): void {
  window.localStorage.removeItem(DOSE_KEY);
}

/** Remove every reading and dose time this browser holds. */
export function clearDeviceDiary(): void {
  clearLocalTests();
  clearDoseClocks();
}
