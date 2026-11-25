import seedJson from "../../fixtures/seed-diary.json";
import type { DiaryPerson, DoseDay, SeedDiary, SpiralTest } from "../types";

// The seeded demo diary, loaded from fixtures/seed-diary.json. JSON imports widen string
// unions ("home" | "uci", "Right" | "Left") to string, so the file is cast once here.
// `npm run seed` validates ids and clocks and keeps the file sorted. Relative imports keep
// this module loadable by tsx in tests and scripts.

const seed = seedJson as unknown as SeedDiary;

export const SEED_PERSON: DiaryPerson = seed.person;
export const SEED_DOSE_DAYS: DoseDay[] = seed.doseDays;
export const SEED_TESTS: SpiralTest[] = seed.tests;
