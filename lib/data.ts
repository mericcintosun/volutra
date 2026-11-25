import { SEED_DOSE_DAYS, SEED_PERSON, SEED_TESTS } from "./data/seed";
import { analyzeTrace, synthesizeTrace, type SpiralAnalysis, type TracePoint } from "./tremor";
import type { DayPoint, DayVerdict, DiaryPerson, DoseDay, SpiralStatus, SpiralTest, TestSummary } from "./types";

// Seeded demo diary: two days of home spirals after a 08:00 levodopa dose, plus two
// stand-ins shaped like UCI 395 static spiral tests (one Parkinson's, one control).
// The values live in fixtures/seed-diary.json; this module keeps the public names and
// the pure helpers. Traces are synthesized from each record's generator so every number
// on screen comes out of the real analysis pipeline. Phase 2 swaps the two "uci" records
// for converted UCI recordings through the real adapter (lib/adapter.ts).

export type { DayPoint, DayVerdict, DoseDay, SpiralSource, SpiralStatus, SpiralTest, TestSummary } from "./types";

export const DEMO_PERSON: DiaryPerson = SEED_PERSON;

export const WEARING_OFF_RATIO = 1.5;

export const DOSE_DAYS: DoseDay[] = SEED_DOSE_DAYS;

export const SPIRAL_TESTS: SpiralTest[] = SEED_TESTS;

/* ---------- clock helpers ---------- */

export function clockToMinutes(clock: string): number {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToClock(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatSinceDose(mins: number): string {
  if (mins < 0) return `${Math.abs(mins)} min before the dose`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/* ---------- lookups and analysis ---------- */

export function getTest(id: string): SpiralTest | undefined {
  return SPIRAL_TESTS.find((t) => t.id === id);
}

export function getDoseDay(day: string): DoseDay | undefined {
  return DOSE_DAYS.find((d) => d.day === day);
}

export function traceForTest(test: SpiralTest): TracePoint[] {
  return synthesizeTrace(test.generator, test.id);
}

const analysisCache = new Map<string, SpiralAnalysis | null>();

export function analysisForTest(test: SpiralTest): SpiralAnalysis | null {
  if (!analysisCache.has(test.id)) analysisCache.set(test.id, analyzeTrace(traceForTest(test)));
  return analysisCache.get(test.id) ?? null;
}

/* ---------- wearing-off rule ---------- */

/**
 * Personal baseline = mean amplitude of the first two spirals drawn at least 30 minutes
 * after the dose. The first later spiral at or above baseline x 1.5 marks wearing-off.
 */
export function assessDay(points: DayPoint[], doseClock: string, ratio = WEARING_OFF_RATIO): DayVerdict {
  const dose = clockToMinutes(doseClock);
  const after = [...points]
    .filter((p) => clockToMinutes(p.clock) >= dose + 30)
    .sort((a, b) => clockToMinutes(a.clock) - clockToMinutes(b.clock));
  const empty: DayVerdict = { baselineMm: null, thresholdMm: null, baselineIds: [], wearingOffClock: null, wearingOffId: null, minutesAfterDose: null };
  if (after.length < 2) return empty;
  const base = after.slice(0, 2);
  const baselineMm = (base[0].amplitudeMm + base[1].amplitudeMm) / 2;
  const thresholdMm = baselineMm * ratio;
  const hit = after.slice(2).find((p) => p.amplitudeMm >= thresholdMm);
  return {
    baselineMm: +baselineMm.toFixed(3),
    thresholdMm: +thresholdMm.toFixed(3),
    baselineIds: base.map((p) => p.id),
    wearingOffClock: hit ? hit.clock : null,
    wearingOffId: hit ? hit.id : null,
    minutesAfterDose: hit ? clockToMinutes(hit.clock) - dose : null,
  };
}

/* ---------- summaries for lists, overview and timeline ---------- */

function rawSummary(test: SpiralTest): Omit<TestSummary, "status"> {
  const a = analysisForTest(test);
  const dd = getDoseDay(test.day);
  return {
    id: test.id,
    day: test.day,
    dayLabel: dd ? dd.label : "UCI 395 replay",
    clock: test.clock,
    source: test.source,
    device: test.device,
    note: test.note,
    uciGroup: test.uciGroup,
    peakHz: a?.peakHz ?? 0,
    amplitudeMm: a?.amplitudeMm ?? 0,
    sampleRateHz: a?.sampleRateHz ?? 0,
    minutesSinceDose: dd ? clockToMinutes(test.clock) - clockToMinutes(dd.doseClock) : null,
  };
}

export function summariesForDay(day: string): TestSummary[] {
  const dd = getDoseDay(day);
  const raws = SPIRAL_TESTS.filter((t) => t.day === day)
    .map(rawSummary)
    .sort((a, b) => clockToMinutes(a.clock) - clockToMinutes(b.clock));
  if (!dd) return raws.map((r) => ({ ...r, status: "replay" as const }));
  const verdict = assessDay(raws, dd.doseClock);
  return raws.map((r) => ({ ...r, status: statusFor(r, verdict) }));
}

export function statusFor(p: { id: string; amplitudeMm: number }, v: DayVerdict): SpiralStatus {
  if (v.baselineIds.includes(p.id)) return "baseline";
  if (v.thresholdMm !== null && p.amplitudeMm >= v.thresholdMm) return "past";
  return "within";
}

export function allSummaries(): TestSummary[] {
  const home = DOSE_DAYS.flatMap((d) => summariesForDay(d.day));
  const uci = SPIRAL_TESTS.filter((t) => t.source === "uci").map((t) => ({ ...rawSummary(t), status: "replay" as const }));
  return [...home, ...uci];
}

export function summaryFor(id: string): TestSummary | undefined {
  return allSummaries().find((s) => s.id === id);
}

export const STATUS_LABEL: Record<SpiralStatus, string> = {
  baseline: "Baseline",
  within: "Within range",
  past: "Past threshold",
  replay: "UCI replay",
};
