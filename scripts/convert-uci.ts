import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { CORE_LOG, UCI_CACHE_DIR, UCI_TEST_ID_STATIC, UCI_ZIP_URL } from "../lib/config";
import type { ErrorCode } from "../lib/errors";
import { featureVector, type SubjectFeatures } from "../lib/features";
import { UciManifestSchema, type UciManifest, type UciRecording } from "../lib/schemas";
import { GUIDE_MAX_RADIUS_MM, analyzeTrace, unwrapSpiral, type SpiralAnalysis, type TracePoint } from "../lib/tremor";
import { fetchWithRetry } from "./lib/fetch";
import { readZip } from "./lib/unzip";

// Converts UCI 395 (Parkinson Disease Spiral Drawings Using Digitized Graphics Tablet) into
// the two replay recordings in data/uci/manifest.json and returns per-subject features for
// scripts/train-model.ts. Run with `npm run convert:uci`. On any failure it writes nothing
// and returns { ok: false, reason }, so the committed data stays as it was.

export const UCI_PWP_ID = "uci-pwp-sst-07";
export const UCI_CTL_ID = "uci-ctl-sst-02";
export const UNITS_NOTE = "scaled to the on-screen guide, approximate mm";

/** Wacom tablets report y growing downward; flip so y grows upward like the pad. */
const TABLET_ORIGIN_TOP_LEFT = true;
const PWP_BAND_HZ = { low: 4, high: 6 };
const CENTER_SEARCH = { halfUnits: 15, steps: 64, maxPoints: 600 };
const MANIFEST_PATH = path.join("data", "uci", "manifest.json");
const ZIP_NAME = "uci-395.zip";
const EXTRACTED_DIR = path.join(UCI_CACHE_DIR, "extracted");

export const SELECTION_RULE =
  "Static spiral tests (Test ID 0), pen-down rows only. Disclosed replay pick: the Parkinson's file whose spectrum peak is in 4 to 6 Hz with the highest band amplitude, and the control file with the lowest band amplitude.";

/* ---------- parsing ---------- */

export interface UciRow {
  x: number;
  y: number;
  z: number;
  pressure: number;
  grip: number;
  timestamp: number;
  testId: number;
}

/** Parses `X;Y;Z;Pressure;GripAngle;Timestamp;Test ID` lines. Header and malformed lines are skipped. */
export function parseUciLines(text: string): UciRow[] {
  const rows: UciRow[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(";").map((s) => s.trim());
    if (parts.length < 7 || parts.slice(0, 7).some((s) => s === "")) continue;
    const v = parts.slice(0, 7).map(Number);
    if (v.some((n) => !Number.isFinite(n))) continue;
    rows.push({ x: v[0], y: v[1], z: v[2], pressure: v[3], grip: v[4], timestamp: v[5], testId: v[6] });
  }
  return rows;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Median sample spacing over 1 means the timestamps are milliseconds; otherwise seconds. */
export function detectTimeUnit(timestamps: number[]): "ms" | "s" {
  const gaps: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    const d = timestamps[i] - timestamps[i - 1];
    if (d > 0) gaps.push(d);
  }
  return median(gaps) > 1 ? "ms" : "s";
}

/** Static spiral rows with the pen down, as tablet-unit points with t in seconds from pen-down. */
export function staticTraceRaw(rows: UciRow[]): TracePoint[] {
  const pen = rows.filter((r) => r.testId === UCI_TEST_ID_STATIC && r.pressure > 0);
  if (pen.length < 2) return [];
  const scale = detectTimeUnit(pen.map((r) => r.timestamp)) === "ms" ? 0.001 : 1;
  const t0 = pen[0].timestamp;
  const out: TracePoint[] = [];
  let lastT = -Infinity;
  for (const r of pen) {
    const t = (r.timestamp - t0) * scale;
    if (t <= lastT) continue;
    lastT = t;
    out.push({ x: r.x, y: TABLET_ORIGIN_TOP_LEFT ? -r.y : r.y, t });
  }
  return out;
}

/* ---------- centre and scale ---------- */

function residualRms(points: TracePoint[], center: { x: number; y: number }): number {
  const u = unwrapSpiral(points, center);
  if (!u) return Infinity;
  if (Math.abs(u.theta[u.theta.length - 1] - u.theta[0]) < 2 * Math.PI) return Infinity;
  let ss = 0;
  for (const e of u.residual) ss += e * e;
  return Math.sqrt(ss / u.residual.length);
}

/**
 * Grid search (plus or minus 15 units, 64 steps per axis) around the first pen-down point for
 * the centre that minimizes the Archimedes fit residual. The bounding-box centre is checked
 * as a second starting point in case a subject drew from the outside in.
 */
export function findCenter(points: TracePoint[]): { x: number; y: number } {
  const step = Math.max(1, Math.ceil(points.length / CENTER_SEARCH.maxPoints));
  const sample = points.filter((_, i) => i % step === 0);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const seeds = [
    { x: points[0].x, y: points[0].y },
    { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
  ];
  const seed = residualRms(sample, seeds[0]) <= residualRms(sample, seeds[1]) ? seeds[0] : seeds[1];
  let best = seed;
  let bestRms = residualRms(sample, seed);
  const { halfUnits, steps } = CENTER_SEARCH;
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < steps; j++) {
      const c = {
        x: seed.x - halfUnits + (2 * halfUnits * i) / (steps - 1),
        y: seed.y - halfUnits + (2 * halfUnits * j) / (steps - 1),
      };
      const rms = residualRms(sample, c);
      if (rms < bestRms) {
        bestRms = rms;
        best = c;
      }
    }
  }
  return best;
}

function outerRadius(points: TracePoint[]): number {
  const r = points.map((p) => Math.hypot(p.x, p.y)).sort((a, b) => a - b);
  return r[Math.min(r.length - 1, Math.floor(r.length * 0.95))];
}

/* ---------- source files ---------- */

interface SourceFile {
  name: string;
  text: string;
}

type SourceResult = { ok: true; files: SourceFile[] } | { ok: false; error: ErrorCode; reason: string };

function walkTxt(dir: string, base: string): SourceFile[] {
  const out: SourceFile[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkTxt(full, base));
    else if (entry.toLowerCase().endsWith(".txt")) {
      out.push({ name: path.relative(base, full).split(path.sep).join("/"), text: readFileSync(full, "utf8") });
    }
  }
  return out;
}

function fromExtracted(): SourceFile[] | null {
  const dir = path.resolve(EXTRACTED_DIR);
  if (!existsSync(dir)) return null;
  const files = walkTxt(dir, dir);
  console.log(`${CORE_LOG} uci using extracted folder, ${files.length} txt files`);
  return files.length ? files : null;
}

async function loadSourceFiles(): Promise<SourceResult> {
  const cacheDir = path.resolve(UCI_CACHE_DIR);
  const zipPath = path.join(cacheDir, ZIP_NAME);
  let zip: Buffer | null = null;
  if (existsSync(zipPath)) {
    zip = readFileSync(zipPath);
    console.log(`${CORE_LOG} uci cached zip ${zip.length} bytes`);
  } else {
    const res = await fetchWithRetry(UCI_ZIP_URL);
    if (res.ok) {
      zip = Buffer.from(res.bytes);
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(zipPath, zip);
    } else {
      const extracted = fromExtracted();
      if (extracted) return { ok: true, files: extracted };
      return {
        ok: false,
        error: res.error,
        reason: res.error === "upstream_timeout" ? "the UCI 395 download timed out" : "the UCI 395 download failed",
      };
    }
  }
  try {
    const entries = readZip(zip).filter((e) => e.name.toLowerCase().endsWith(".txt"));
    return { ok: true, files: entries.map((e) => ({ name: e.name, text: e.data.toString("utf8") })) };
  } catch {
    const extracted = fromExtracted();
    if (extracted) return { ok: true, files: extracted };
    return { ok: false, error: "parse_failure", reason: "the UCI 395 zip could not be read" };
  }
}

function groupOf(name: string): "parkinsons" | "control" | null {
  const dirs = name.toLowerCase().split("/").slice(0, -1);
  if (dirs.some((d) => d.includes("control"))) return "control";
  if (dirs.some((d) => d.includes("parkinson"))) return "parkinsons";
  return null;
}

/* ---------- the conversion ---------- */

export interface ChosenRecording {
  id: string;
  group: "parkinsons" | "control";
  subjectFile: string;
  sampleRateHz: number;
  peakHz: number;
  amplitudeMm: number;
  points: TracePoint[];
}

export type ConvertResult =
  | {
      ok: true;
      counts: { parkinsons: number; control: number };
      folders: string[];
      unitsPerMm: number;
      chosen: ChosenRecording[];
      subjects: SubjectFeatures[];
    }
  | { ok: false; error: ErrorCode; reason: string };

interface Prepared {
  file: string;
  group: "parkinsons" | "control";
  centered: TracePoint[];
  outer: number;
}

const round = (v: number, digits: number) => +v.toFixed(digits);

function toRecording(
  id: string,
  p: Prepared,
  unitsPerMm: number
): { rec: UciRecording; chosen: ChosenRecording } | null {
  const points = p.centered.map((q) => ({
    x: round(q.x / unitsPerMm, 2),
    y: round(q.y / unitsPerMm, 2),
    t: round(q.t, 3),
  }));
  // the UI analyses the rounded points, so the proof reports the same numbers it will show
  const a = analyzeTrace(points);
  if (!a) return null;
  const subjectFile = p.file.split("/").pop() ?? p.file;
  return {
    rec: { id, group: p.group, subjectFile, unitsNote: UNITS_NOTE, sampleRateHz: a.sampleRateHz, points },
    chosen: { id, group: p.group, subjectFile, sampleRateHz: a.sampleRateHz, peakHz: a.peakHz, amplitudeMm: a.amplitudeMm, points },
  };
}

export async function convertUci(): Promise<ConvertResult> {
  const started = Date.now();
  const source = await loadSourceFiles();
  if (!source.ok) {
    console.log(`${CORE_LOG} uci convert not run: ${source.error}`);
    return source;
  }

  const folders = Array.from(new Set(source.files.map((f) => f.name.split("/").slice(0, -1).join("/")))).sort();
  console.log(`${CORE_LOG} uci folders found: ${folders.join(", ") || "(root)"}`);

  const prepared: Prepared[] = [];
  for (const f of [...source.files].sort((a, b) => a.name.localeCompare(b.name))) {
    const group = groupOf(f.name);
    if (!group) continue;
    const raw = staticTraceRaw(parseUciLines(f.text));
    if (raw.length < 64) continue;
    const c = findCenter(raw);
    const centered = raw.map((p) => ({ x: p.x - c.x, y: p.y - c.y, t: p.t }));
    prepared.push({ file: f.name, group, centered, outer: outerRadius(centered) });
  }
  if (prepared.length === 0) {
    return { ok: false, error: "parse_failure", reason: "no static spiral tests were found in the UCI 395 files" };
  }

  // one scale for every file: the median outer radius maps onto the guide's outer radius
  const UCI_UNITS_PER_MM = median(prepared.map((p) => p.outer)) / GUIDE_MAX_RADIUS_MM;
  if (!(UCI_UNITS_PER_MM > 0)) {
    return { ok: false, error: "parse_failure", reason: "the UCI 395 spirals had no measurable radius" };
  }

  const analysed: { p: Prepared; a: SpiralAnalysis }[] = [];
  for (const p of prepared) {
    const pts = p.centered.map((q) => ({ x: q.x / UCI_UNITS_PER_MM, y: q.y / UCI_UNITS_PER_MM, t: q.t }));
    const a = analyzeTrace(pts);
    if (a) analysed.push({ p, a });
  }
  const subjects: SubjectFeatures[] = analysed.map(({ p, a }) => ({ file: p.file, group: p.group, features: featureVector(a) }));
  const counts = {
    parkinsons: subjects.filter((s) => s.group === "parkinsons").length,
    control: subjects.filter((s) => s.group === "control").length,
  };
  console.log(`${CORE_LOG} uci convert parkinsons=${counts.parkinsons} control=${counts.control} unitsPerMm=${UCI_UNITS_PER_MM.toFixed(3)}`);

  const pwp = analysed
    .filter(({ p, a }) => p.group === "parkinsons" && a.peakHz >= PWP_BAND_HZ.low && a.peakHz <= PWP_BAND_HZ.high)
    .sort((x, y) => y.a.amplitudeMm - x.a.amplitudeMm)[0];
  const ctl = analysed.filter(({ p }) => p.group === "control").sort((x, y) => x.a.amplitudeMm - y.a.amplitudeMm)[0];
  if (!pwp || !ctl) {
    return {
      ok: false,
      error: "parse_failure",
      reason: !pwp ? "no Parkinson's file peaked in 4 to 6 Hz" : "no control file could be analysed",
    };
  }

  const pwpOut = toRecording(UCI_PWP_ID, pwp.p, UCI_UNITS_PER_MM);
  const ctlOut = toRecording(UCI_CTL_ID, ctl.p, UCI_UNITS_PER_MM);
  if (!pwpOut || !ctlOut) {
    return { ok: false, error: "parse_failure", reason: "a chosen UCI 395 recording could not be analysed after rounding" };
  }

  const manifest: UciManifest = {
    status: "converted",
    convertedAt: new Date().toISOString(),
    source: `UCI 395, CC BY 4.0. ${SELECTION_RULE}`,
    recordings: [pwpOut.rec, ctlOut.rec],
  };
  const check = UciManifestSchema.safeParse(manifest);
  if (!check.success) {
    console.log(`${CORE_LOG} manifest parse failure before write`);
    return { ok: false, error: "parse_failure", reason: "the converted manifest did not pass its schema" };
  }
  const outPath = path.resolve(MANIFEST_PATH);
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(check.data)}\n`);
  console.log(`${CORE_LOG} uci manifest written, 2 recordings, ${Date.now() - started} ms`);

  return {
    ok: true,
    counts,
    folders,
    unitsPerMm: +UCI_UNITS_PER_MM.toFixed(4),
    chosen: [pwpOut.chosen, ctlOut.chosen],
    subjects,
  };
}

function isDirectRun(file: string): boolean {
  const entry = (process.argv[1] ?? "").split(path.sep).join("/");
  return entry.endsWith(file) || entry.endsWith(file.replace(/\.ts$/, ""));
}

if (isDirectRun("scripts/convert-uci.ts")) {
  convertUci().then(
    (r) => {
      if (r.ok) {
        for (const c of r.chosen) console.log(`${c.id}: ${c.subjectFile}, ${c.sampleRateHz} Hz sampling, peak ${c.peakHz} Hz, ${c.amplitudeMm} mm`);
      } else {
        console.log(`Not converted: ${r.reason}.`);
        process.exitCode = 1;
      }
    },
    (err: unknown) => {
      console.log(`Not converted: ${err instanceof Error ? err.message : "unknown error"}.`);
      process.exitCode = 1;
    }
  );
}
