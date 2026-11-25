import type { SpiralAnalysis } from "./tremor";

// The visitor's own diary lives in localStorage only. Nothing is sent to a server.

export interface LocalTest {
  id: string;
  day: string;
  clock: string;
  peakHz: number;
  amplitudeMm: number;
  sampleRateHz: number;
}

const TESTS_KEY = "volutra.local-tests.v1";
const DOSE_KEY = "volutra.dose-clock.v1";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function todayIso(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function readLocalTests(): LocalTest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TESTS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as LocalTest[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalTest(a: SpiralAnalysis): LocalTest {
  const now = new Date();
  const entry: LocalTest = {
    id: `local-${now.getTime()}`,
    day: todayIso(now),
    clock: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    peakHz: a.peakHz,
    amplitudeMm: a.amplitudeMm,
    sampleRateHz: a.sampleRateHz,
  };
  const next = [...readLocalTests(), entry].slice(-60);
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
    const raw = window.localStorage.getItem(DOSE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function writeDoseClock(day: string, clock: string): void {
  const next = { ...readDoseClocks(), [day]: clock };
  window.localStorage.setItem(DOSE_KEY, JSON.stringify(next));
}
