import manifestJson from "../data/uci/manifest.json";
import { CORE_LOG } from "./config";
import { DOSE_DAYS, createDiary, type Diary } from "./data";
import { SEED_TESTS } from "./data/seed";
import { UciManifestSchema, type UciRecording } from "./schemas";
import type { DiaryAdapter, DiarySource, SpiralTest } from "./types";

// The real diary: the seed's home spirals plus the two UCI records swapped for the
// recordings scripts/convert-uci.ts wrote to data/uci/manifest.json. If the manifest does
// not parse or has not been converted yet, it falls back to the seed stand-ins and says so
// through source = "uci-395-pending".

function withRecording(test: SpiralTest, rec: UciRecording): SpiralTest {
  const points = rec.points;
  const durationS = points.length > 1 ? points[points.length - 1].t - points[0].t : test.generator.durationS;
  return {
    ...test,
    uciGroup: rec.group === "parkinsons" ? "Parkinson's" : "Control",
    note: `Static spiral test from UCI 395 subject file ${rec.subjectFile}, ${rec.group === "parkinsons" ? "Parkinson's" : "control"} group, recorded on a Wacom tablet.`,
    generator: { ...test.generator, durationS: +durationS.toFixed(1), sampleRateHz: rec.sampleRateHz },
    recording: { subjectFile: rec.subjectFile, unitsNote: rec.unitsNote, points },
  };
}

function fromDiary(diary: Diary, source: DiarySource): DiaryAdapter {
  return {
    mode: "real",
    source,
    listSummaries: () => diary.allSummaries(),
    getSummary: (id) => diary.summaryFor(id),
    getTest: (id) => diary.getTest(id),
    listDays: () => DOSE_DAYS,
    summariesForDay: (day) => diary.summariesForDay(day),
  };
}

function buildRealAdapter(): DiaryAdapter {
  const parsed = UciManifestSchema.safeParse(manifestJson);
  if (!parsed.success) {
    console.warn(`${CORE_LOG} manifest parse failure, using stand-ins`);
    return fromDiary(createDiary(SEED_TESTS), "uci-395-pending");
  }
  const manifest = parsed.data;
  if (manifest.status !== "converted" || manifest.recordings.length === 0) {
    console.log(`${CORE_LOG} uci manifest not converted, using stand-ins`);
    return fromDiary(createDiary(SEED_TESTS), "uci-395-pending");
  }
  const byId = new Map(manifest.recordings.map((r) => [r.id, r] as const));
  let swapped = 0;
  const tests = SEED_TESTS.map((t) => {
    const rec = byId.get(t.id);
    if (!rec) return t;
    swapped++;
    return withRecording(t, rec);
  });
  console.log(`${CORE_LOG} uci manifest converted, ${swapped} recordings swapped in`);
  return fromDiary(createDiary(tests), "uci-395");
}

let cached: DiaryAdapter | null = null;

/** Built once per server process, on first use. */
export function getRealAdapter(): DiaryAdapter {
  if (!cached) cached = buildRealAdapter();
  return cached;
}
