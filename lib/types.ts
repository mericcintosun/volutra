import type { SpiralGenerator } from "./tremor";

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

/** Shape every API stub returns. */
export interface ApiResponse<T> {
  data: T;
  mode: "fake" | "real";
  source: string;
}

/** Logistic regression weights. Phase 2's training script writes this shape to lib/model-weights.json. */
export interface ModelWeights {
  status: "provisional" | "trained";
  features: { name: string; mean: number; std: number; weight: number }[];
  bias: number;
  balancedAccuracy: number | null;
  folds: number | null;
}
