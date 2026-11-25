import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { test } from "node:test";
import provisionalJson from "../fixtures/model-weights.provisional.json";
import { assessDay, summariesForDay } from "../lib/data";
import { patientGroupSimilarity } from "../lib/model";
import { LastSpectrumSchema, ModelWeightsSchema, SpiralIdSchema } from "../lib/schemas";
import { analyzeTrace, synthesizeTrace, type SpiralAnalysis } from "../lib/tremor";
import { detectTimeUnit, parseUciLines, staticTraceRaw } from "../scripts/convert-uci";

// Run with `npm test`. Five fixed inputs from the phase spec plus the UCI line parser and
// the weights schema.

test("a 5 Hz, 0.6 mm synthetic tremor reads back within 0.3 Hz and 25%", () => {
  const trace = synthesizeTrace({ durationS: 15, sampleRateHz: 120, tremorHz: 5, tremorMm: 0.6 }, "test-5hz");
  const a = analyzeTrace(trace);
  assert.ok(a, "analysis should not be null");
  assert.ok(Math.abs(a.peakHz - 5) <= 0.3, `peak ${a.peakHz} Hz`);
  assert.ok(Math.abs(a.amplitudeMm - 0.6) <= 0.6 * 0.25, `amplitude ${a.amplitudeMm} mm`);
});

test("a trace with no tremor reads below 0.15 mm", () => {
  const trace = synthesizeTrace({ durationS: 15, sampleRateHz: 120, tremorHz: 5, tremorMm: 0 }, "test-flat");
  const a = analyzeTrace(trace);
  assert.ok(a, "analysis should not be null");
  assert.ok(a.amplitudeMm < 0.15, `amplitude ${a.amplitudeMm} mm`);
});

test("the seed days flag wearing-off at 14:40 and 15:10", () => {
  assert.equal(assessDay(summariesForDay("2026-11-24"), "08:00").wearingOffClock, "14:40");
  assert.equal(assessDay(summariesForDay("2026-11-23"), "08:00").wearingOffClock, "15:10");
});

test("patientGroupSimilarity increases with amplitude", () => {
  const base: SpiralAnalysis = {
    peakHz: 5,
    amplitudeMm: 0.2,
    bandRatio: 0.5,
    residualRmsMm: 1,
    sampleRateHz: 100,
    durationS: 15,
    points: 1500,
    fit: { a: 2, b: 2.2 },
    spectrum: [],
  };
  const scores = [0.2, 0.6, 1.6].map((mm) => patientGroupSimilarity({ ...base, amplitudeMm: mm }).score);
  assert.ok(scores[0] < scores[1] && scores[1] < scores[2], `scores ${scores.join(", ")}`);
});

test("SpiralIdSchema rejects a path and accepts a UCI id", () => {
  assert.equal(SpiralIdSchema.safeParse("../x").success, false);
  assert.equal(SpiralIdSchema.safeParse("uci-pwp-sst-07").success, true);
  assert.equal(SpiralIdSchema.safeParse("new").success, true);
});

test("UCI line parser reads the sample and detects millisecond timestamps", () => {
  const text = readFileSync(path.join("tests", "fixtures", "uci-sample.txt"), "utf8");
  const rows = parseUciLines(`X ; Y; Z; Pressure; GripAngle; Timestamp; Test ID\n${text}`);
  assert.equal(rows.length, 6);
  assert.equal(detectTimeUnit(rows.map((r) => r.timestamp)), "ms");
  assert.equal(detectTimeUnit([0, 0.008, 0.016, 0.024]), "s");
  const trace = staticTraceRaw(rows);
  // pen-up row and the dynamic test row are dropped
  assert.equal(trace.length, 4);
  assert.equal(trace[0].t, 0);
  assert.ok(Math.abs(trace[3].t - 0.032) < 1e-9, `t ${trace[3].t}`);
  assert.equal(trace[0].y, -204);
});

test("the seed 24 Nov day still flags 14:40 with the 16:30 second dose window", () => {
  const v = assessDay(summariesForDay("2026-11-24"), "08:00", 1.5, "16:30");
  assert.equal(v.wearingOffClock, "14:40");
  assert.equal(v.minutesAfterDose, 400);
  assert.equal(assessDay(summariesForDay("2026-11-23"), "08:00", 1.5, "16:30").wearingOffClock, "15:10");
});

test("readings after nextDoseClock do not count toward the verdict", () => {
  const day = [
    { id: "a", clock: "09:00", amplitudeMm: 0.4 },
    { id: "b", clock: "10:00", amplitudeMm: 0.4 },
    { id: "c", clock: "12:00", amplitudeMm: 0.45 },
    { id: "d", clock: "13:10", amplitudeMm: 1.2 },
    { id: "e", clock: "14:00", amplitudeMm: 1.4 },
  ];
  // without a second dose the 13:10 reading crosses 1.5x baseline
  assert.equal(assessDay(day, "08:00").wearingOffClock, "13:10");
  // a second dose at 13:00 closes the window, so 13:10 and 14:00 are ignored
  const v = assessDay(day, "08:00", 1.5, "13:00");
  assert.equal(v.wearingOffClock, null);
  assert.equal(v.wearingOffId, null);
  assert.deepEqual(v.baselineIds, ["a", "b"]);
});

test("LastSpectrumSchema accepts real analysis bins and rejects a NaN", () => {
  const a = analyzeTrace(synthesizeTrace({ durationS: 15, sampleRateHz: 120, tremorHz: 5, tremorMm: 0.6 }, "test-last-spectrum"));
  assert.ok(a, "analysis should not be null");
  const spectrum = a.spectrum.filter((b) => b.hz <= 15).map((b) => ({ hz: b.hz, mm: b.mm }));
  const entry = { clock: "14:05", peakHz: a.peakHz, amplitudeMm: a.amplitudeMm, spectrum };
  assert.equal(LastSpectrumSchema.safeParse(entry).success, true);
  const broken = { ...entry, spectrum: [{ hz: 1, mm: Number.NaN }, ...spectrum.slice(1)] };
  assert.equal(LastSpectrumSchema.safeParse(broken).success, false);
});

test("ModelWeightsSchema accepts the provisional fixture", () => {
  assert.equal(ModelWeightsSchema.safeParse(provisionalJson).success, true);
});
