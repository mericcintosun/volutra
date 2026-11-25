import { DOSE_DAYS, allSummaries, getTest, summariesForDay, summaryFor } from "./data";
import type { DiaryAdapter } from "./types";

/** Seed diary from fixtures/seed-diary.json with synthesized UCI stand-ins. The demo insurance. */
export const fakeAdapter: DiaryAdapter = {
  mode: "fake",
  source: "seed",
  listSummaries: () => allSummaries(),
  getSummary: (id) => summaryFor(id),
  getTest: (id) => getTest(id),
  listDays: () => DOSE_DAYS,
  summariesForDay: (day) => summariesForDay(day),
};
