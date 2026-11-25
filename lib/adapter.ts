import { DOSE_DAYS, allSummaries, getTest, summariesForDay, summaryFor } from "./data";
import type { DoseDay, SpiralTest, TestSummary } from "./types";

// The data seam. Pages and API stubs read the diary only through a DiaryAdapter, so
// Phase 2 can swap synthesized UCI stand-ins for converted recordings without editing a
// page. Server-side use only: ADAPTER_MODE has no NEXT_PUBLIC_ prefix.

export type AdapterMode = "fake" | "real";

export interface DiaryAdapter {
  mode: AdapterMode;
  listSummaries(): TestSummary[];
  getSummary(id: string): TestSummary | undefined;
  getTest(id: string): SpiralTest | undefined;
  listDays(): DoseDay[];
  summariesForDay(day: string): TestSummary[];
}

/** Seed diary from fixtures/seed-diary.json, every number computed by lib/tremor.ts. */
export const fakeAdapter: DiaryAdapter = {
  mode: "fake",
  listSummaries: () => allSummaries(),
  getSummary: (id) => summaryFor(id),
  getTest: (id) => getTest(id),
  listDays: () => DOSE_DAYS,
  summariesForDay: (day) => summariesForDay(day),
};

export function getAdapter(): DiaryAdapter {
  const mode: AdapterMode = process.env.ADAPTER_MODE === "real" ? "real" : "fake";
  if (mode === "real") {
    // Phase 2: real adapter loads data/uci/*.json
    return fakeAdapter;
  }
  return fakeAdapter;
}
