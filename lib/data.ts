import { cachedAnalysis } from "./cache";
import { SEED_DOSE_DAYS, SEED_PERSON, SEED_TESTS } from "./data/seed";
import { synthesizeTrace, type SpiralAnalysis, type TracePoint } from "./tremor";
import type { DayPoint, DayVerdict, DiaryPerson, DoseDay, SpiralStatus, SpiralTest, TestSummary } from "./types";

// Seeded demo diary: two days of home spirals after a 08:00 levodopa dose, plus two
// stand-ins shaped like UCI 395 static spiral tests (one Parkinson's, one control).
// The values live in fixtures/seed-diary.json; this module keeps the public names and
// the pure helpers. A record without a converted recording is synthesized from its
// generator, so every number on screen comes out of the real analysis pipeline.
// createDiary() builds the same helpers over any list of records: the real adapter
// (lib/adapter-real.ts) calls it with the two UCI records swapped for converted files.

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

export function getDoseDay(day: string): DoseDay | undefined {
  return DOSE_DAYS.find((d) => d.day === day);
}

// keyed by record object: the fake and real diaries hold different objects for the same id
const synthesized = new WeakMap<SpiralTest, TracePoint[]>();

/** The converted recording when the record has one, otherwise the synthesized trace. */
export function traceForTest(test: SpiralTest): TracePoint[] {
  if (test.recording) return test.recording.points;
  let trace = synthesized.get(test);
  if (!trace) {
    trace = synthesizeTrace(test.generator, test.id);
    synthesized.set(test, trace);
  }
  return trace;
}

export function analysisForTest(test: SpiralTest): SpiralAnalysis | null {
  return cachedAnalysis(traceForTest(test));
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

export function statusFor(p: { id: string; amplitudeMm: number }, v: DayVerdict): SpiralStatus {
  if (v.baselineIds.includes(p.id)) return "baseline";
  if (v.thresholdMm !== null && p.amplitudeMm >= v.thresholdMm) return "past";
  return "within";
}

export interface Diary {
  getTest(id: string): SpiralTest | undefined;
  allSummaries(): TestSummary[];
  summaryFor(id: string): TestSummary | undefined;
  summariesForDay(day: string): TestSummary[];
}

/** The lookup and summary helpers over one list of records. */
export function createDiary(tests: SpiralTest[]): Diary {
  const getTest = (id: string) => tests.find((t) => t.id === id);

  const summariesForDay = (day: string): TestSummary[] => {
    const dd = getDoseDay(day);
    const raws = tests
      .filter((t) => t.day === day)
      .map(rawSummary)
      .sort((a, b) => clockToMinutes(a.clock) - clockToMinutes(b.clock));
    if (!dd) return raws.map((r) => ({ ...r, status: "replay" as const }));
    const verdict = assessDay(raws, dd.doseClock);
    return raws.map((r) => ({ ...r, status: statusFor(r, verdict) }));
  };

  const allSummaries = (): TestSummary[] => {
    const home = DOSE_DAYS.flatMap((d) => summariesForDay(d.day));
    const uci = tests.filter((t) => t.source === "uci").map((t) => ({ ...rawSummary(t), status: "replay" as const }));
    return [...home, ...uci];
  };

  const summaryFor = (id: string) => allSummaries().find((s) => s.id === id);

  return { getTest, allSummaries, summaryFor, summariesForDay };
}

const seedDiary = createDiary(SPIRAL_TESTS);

export const getTest = seedDiary.getTest;
export const summariesForDay = seedDiary.summariesForDay;
export const allSummaries = seedDiary.allSummaries;
export const summaryFor = seedDiary.summaryFor;

export const STATUS_LABEL: Record<SpiralStatus, string> = {
  baseline: "Baseline",
  within: "Within range",
  past: "Past threshold",
  replay: "UCI replay",
};
