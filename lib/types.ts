import type { SpiralGenerator, TracePoint } from "./tremor";

// Shared types for the diary, the adapter seam, the API stubs and the model weights.

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
  /** A converted recording (UCI 395). When present it replaces the synthesized trace. */
  recording?: { subjectFile: string; unitsNote: string; points: TracePoint[] };
}

export interface DoseDay {
  day: string;
  label: string;
  doseClock: string;
  nextDoseClock: string;
  medication: string;
  diary: string;
}

export interface DiaryPerson {
  label: string;
  medication: string;
  review: string;
}

export interface SeedDiary {
  person: DiaryPerson;
  doseDays: DoseDay[];
  tests: SpiralTest[];
}

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

export type AdapterMode = "fake" | "real";

/** Where the two UCI replays come from: seed stand-ins, converted UCI 395 files, or stand-ins because conversion has not run. */
export type DiarySource = "seed" | "uci-395" | "uci-395-pending";

/** The data seam. Pages and API routes read the diary only through this interface. */
export interface DiaryAdapter {
  mode: AdapterMode;
  source: DiarySource;
  listSummaries(): TestSummary[];
  getSummary(id: string): TestSummary | undefined;
  getTest(id: string): SpiralTest | undefined;
  listDays(): DoseDay[];
  summariesForDay(day: string): TestSummary[];
}

/** Shape every API route returns on success. */
export interface ApiResponse<T> {
  data: T;
  mode: AdapterMode;
  source: DiarySource;
}

/** Logistic regression weights. scripts/train-model.ts writes this shape to lib/model-weights.json. */
export interface ModelWeights {
  status: "provisional" | "trained";
  features: { name: string; mean: number; std: number; weight: number }[];
  bias: number;
  balancedAccuracy: number | null;
  folds: number | null;
  /** subject counts the training run actually found; null until a training run */
  subjects?: { parkinsons: number; control: number } | null;
  trainedAt?: string | null;
  testsUsed?: number | null;
}
