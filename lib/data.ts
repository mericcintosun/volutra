import { analyzeTrace, synthesizeTrace, type SpiralAnalysis, type SpiralGenerator, type TracePoint } from "./tremor";

// Seeded demo diary. Two days of home spirals after a 08:00 levodopa dose, plus two
// stand-ins shaped like UCI 395 static spiral tests (one Parkinson's, one control).
// Traces are synthesized from each record's generator so every number on screen comes
// out of the real analysis pipeline. TODO: swap the two "uci" generators for the
// converted UCI recordings once the dataset is downloaded (HANDOFF.md, mission step 2).

export type SpiralSource = "home" | "uci";
export type SpiralStatus = "baseline" | "within" | "past" | "replay";

export interface SpiralTest {
  id: string;
  /** ISO date of the diary day */
  day: string;
  /** local clock time the spiral was drawn, HH:MM */
  clock: string;
  source: SpiralSource;
  device: string;
  hand: "Right" | "Left";
  note: string;
  uciGroup?: "Parkinson's" | "Control";
  generator: SpiralGenerator;
}

export interface DoseDay {
  day: string;
  label: string;
  doseClock: string;
  nextDoseClock: string;
  medication: string;
  diary: string;
}

export const DEMO_PERSON = {
  label: "Demo diary: R., 64, right-handed, diagnosed 2019",
  medication: "Levodopa/carbidopa 100/25 mg",
  review: "Next neurology review: 12 Jan 2027",
};

export const WEARING_OFF_RATIO = 1.5;

export const DOSE_DAYS: DoseDay[] = [
  {
    day: "2026-11-24",
    label: "Tue 24 Nov",
    doseClock: "08:00",
    nextDoseClock: "16:30",
    medication: "Levodopa/carbidopa 100/25 mg",
    diary: "Felt stiff on the walk back from the pharmacy around three.",
  },
  {
    day: "2026-11-23",
    label: "Mon 23 Nov",
    doseClock: "08:00",
    nextDoseClock: "16:30",
    medication: "Levodopa/carbidopa 100/25 mg",
    diary: "Good morning. Cup rattled on the saucer at tea time.",
  },
];

const phone = "Phone, finger";
const laptop = "Laptop trackpad";

export const SPIRAL_TESTS: SpiralTest[] = [
  { id: "sp-1124-0905", day: "2026-11-24", clock: "09:05", source: "home", device: phone, hand: "Right", note: "After breakfast, sitting at the kitchen table.", generator: { durationS: 14, sampleRateHz: 120, tremorHz: 5.2, tremorMm: 0.41 } },
  { id: "sp-1124-1020", day: "2026-11-24", clock: "10:20", source: "home", device: phone, hand: "Right", note: "Before the pharmacy walk.", generator: { durationS: 13, sampleRateHz: 120, tremorHz: 5.0, tremorMm: 0.44 } },
  { id: "sp-1124-1140", day: "2026-11-24", clock: "11:40", source: "home", device: laptop, hand: "Right", note: "Trackpad, a little rushed.", generator: { durationS: 11, sampleRateHz: 60, tremorHz: 5.3, tremorMm: 0.52 } },
  { id: "sp-1124-1315", day: "2026-11-24", clock: "13:15", source: "home", device: phone, hand: "Right", note: "After lunch.", generator: { durationS: 15, sampleRateHz: 120, tremorHz: 5.1, tremorMm: 0.56 } },
  { id: "sp-1124-1440", day: "2026-11-24", clock: "14:40", source: "home", device: phone, hand: "Right", note: "Hand felt shaky holding the cup.", generator: { durationS: 16, sampleRateHz: 120, tremorHz: 4.9, tremorMm: 0.93 } },
  { id: "sp-1124-1555", day: "2026-11-24", clock: "15:55", source: "home", device: phone, hand: "Right", note: "Stiff, waiting for the 16:30 dose.", generator: { durationS: 18, sampleRateHz: 120, tremorHz: 4.8, tremorMm: 1.28 } },
  { id: "sp-1123-0855", day: "2026-11-23", clock: "08:55", source: "home", device: phone, hand: "Right", note: "First test of the day.", generator: { durationS: 14, sampleRateHz: 120, tremorHz: 5.4, tremorMm: 0.39 } },
  { id: "sp-1123-1040", day: "2026-11-23", clock: "10:40", source: "home", device: phone, hand: "Right", note: "Calm morning.", generator: { durationS: 13, sampleRateHz: 120, tremorHz: 5.2, tremorMm: 0.43 } },
  { id: "sp-1123-1250", day: "2026-11-23", clock: "12:50", source: "home", device: laptop, hand: "Right", note: "Trackpad at the desk.", generator: { durationS: 12, sampleRateHz: 60, tremorHz: 5.0, tremorMm: 0.51 } },
  { id: "sp-1123-1510", day: "2026-11-23", clock: "15:10", source: "home", device: phone, hand: "Right", note: "Tea time, cup rattled.", generator: { durationS: 16, sampleRateHz: 120, tremorHz: 4.9, tremorMm: 0.81 } },
  { id: "sp-1123-1705", day: "2026-11-23", clock: "17:05", source: "home", device: phone, hand: "Right", note: "Half an hour after the second dose.", generator: { durationS: 15, sampleRateHz: 120, tremorHz: 5.1, tremorMm: 0.5 } },
  { id: "uci-pwp-sst-07", day: "2017-03-14", clock: "11:20", source: "uci", device: "Wacom tablet (UCI)", hand: "Right", uciGroup: "Parkinson's", note: "Stand-in shaped like a UCI static spiral test from the Parkinson's group. Replace with the converted recording.", generator: { durationS: 20, sampleRateHz: 100, tremorHz: 5.1, tremorMm: 1.6 } },
  { id: "uci-ctl-sst-02", day: "2017-03-09", clock: "10:05", source: "uci", device: "Wacom tablet (UCI)", hand: "Right", uciGroup: "Control", note: "Stand-in shaped like a UCI static spiral test from the control group. Replace with the converted recording.", generator: { durationS: 17, sampleRateHz: 100, tremorHz: 8.8, tremorMm: 0.09 } },
];

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

export interface DayPoint {
  id: string;
  clock: string;
  amplitudeMm: number;
}

export interface DayVerdict {
  baselineMm: number | null;
  thresholdMm: number | null;
  baselineIds: string[];
  wearingOffClock: string | null;
  wearingOffId: string | null;
  minutesAfterDose: number | null;
}

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

export interface TestSummary {
  id: string;
  day: string;
  dayLabel: string;
  clock: string;
  source: SpiralSource;
  device: string;
  note: string;
  uciGroup?: "Parkinson's" | "Control";
  peakHz: number;
  amplitudeMm: number;
  sampleRateHz: number;
  minutesSinceDose: number | null;
  status: SpiralStatus;
}

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
