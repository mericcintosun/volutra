import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { CORE_LOG } from "../lib/config";
import { UciManifestSchema } from "../lib/schemas";
import { analyzeTrace, type TracePoint } from "../lib/tremor";
import { convertUci, type ConvertResult } from "./convert-uci";
import { trainModel } from "./train-model";

// `npm run proof`: four proofs in order, each printing one stdout line and rewriting its
// own block in README.md (and SUBMISSION.md when it exists). A failing proof writes a
// "Not run in this build" line and leaves the committed data as it was. Never invents a
// number. Always exits 0.

const DOCS = ["README.md", "SUBMISSION.md"];
const TEST_TIMEOUT_MS = 90000;
const LATENCY_RUNS = 20;

function writeBlock(name: string, line: string): void {
  console.log(`${name}: ${line}`);
  for (const doc of DOCS) {
    const file = path.resolve(doc);
    if (!existsSync(file)) continue;
    const text = readFileSync(file, "utf8");
    const begin = `<!-- PROOF:BEGIN ${name} -->`;
    const end = `<!-- PROOF:END ${name} -->`;
    const i = text.indexOf(begin);
    const j = text.indexOf(end);
    if (i < 0 || j < i) continue;
    writeFileSync(file, `${text.slice(0, i + begin.length)}\n${line}\n${text.slice(j)}`);
  }
}

const today = () => new Date().toISOString().slice(0, 10);

async function proveConvert(): Promise<ConvertResult> {
  let r: ConvertResult;
  try {
    r = await convertUci();
  } catch (err) {
    r = { ok: false, error: "parse_failure", reason: `the converter stopped (${err instanceof Error ? err.message : "unknown error"})` };
  }
  if (!r.ok) {
    writeBlock("uci-convert", `Not run in this build: ${r.reason}.`);
    return r;
  }
  const [pwp, ctl] = r.chosen;
  writeBlock(
    "uci-convert",
    `UCI 395 converted on ${today()}: ${r.counts.parkinsons} Parkinson's and ${r.counts.control} control files with a static spiral test. ` +
      `Parkinson's replay \`${pwp.subjectFile}\`: ${pwp.sampleRateHz} Hz sampling, peak ${pwp.peakHz.toFixed(2)} Hz, band amplitude ${pwp.amplitudeMm.toFixed(2)} mm. ` +
      `Control replay \`${ctl.subjectFile}\`: ${ctl.sampleRateHz} Hz sampling, peak ${ctl.peakHz.toFixed(2)} Hz, band amplitude ${ctl.amplitudeMm.toFixed(2)} mm.`
  );
  return r;
}

function proveModel(conv: ConvertResult): void {
  if (!conv.ok) {
    writeBlock("model-cv", "Not run in this build: no converted UCI 395 subjects were available, so the weights stay provisional.");
    return;
  }
  try {
    const r = trainModel(conv.subjects);
    if (!r.ok) {
      writeBlock("model-cv", `Not run in this build: ${r.reason}.`);
      return;
    }
    writeBlock(
      "model-cv",
      `Subject-wise ${r.folds}-fold stratified cross-validation over ${r.subjects.parkinsons} Parkinson's and ${r.subjects.control} control subjects: ` +
        `balanced accuracy ${r.balancedAccuracy.toFixed(3)} on the pooled out-of-fold predictions (trained ${today()}).`
    );
  } catch (err) {
    writeBlock("model-cv", `Not run in this build: training stopped (${err instanceof Error ? err.message : "unknown error"}).`);
  }
}

function proveTests(): void {
  const run = spawnSync("npm", ["test"], {
    encoding: "utf8",
    timeout: TEST_TIMEOUT_MS,
    shell: process.platform === "win32",
  });
  const out = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
  const pass = out.match(/(?:^|\n)\s*(?:#|ℹ)\s*pass\s+(\d+)/);
  const fail = out.match(/(?:^|\n)\s*(?:#|ℹ)\s*fail\s+(\d+)/);
  if (!pass || !fail) {
    writeBlock("tests", "Not run in this build: the `npm test` output could not be read.");
    return;
  }
  writeBlock("tests", `\`npm test\` on ${today()}: ${pass[1]} passed, ${fail[1]} failed.`);
}

function committedPwpPoints(): TracePoint[] | null {
  try {
    const raw: unknown = JSON.parse(readFileSync(path.resolve("data", "uci", "manifest.json"), "utf8"));
    const parsed = UciManifestSchema.safeParse(raw);
    if (!parsed.success || parsed.data.status !== "converted") return null;
    return parsed.data.recordings.find((r) => r.group === "parkinsons")?.points ?? null;
  } catch {
    return null;
  }
}

function proveLatency(conv: ConvertResult): void {
  const points = conv.ok ? conv.chosen[0].points : committedPwpPoints();
  if (!points) {
    writeBlock("latency", "Not run in this build: no converted Parkinson's recording was available to time.");
    return;
  }
  analyzeTrace(points); // warm-up
  const times: number[] = [];
  for (let i = 0; i < LATENCY_RUNS; i++) {
    const t0 = performance.now();
    analyzeTrace(points);
    times.push(performance.now() - t0);
  }
  times.sort((a, b) => a - b);
  const med = times[LATENCY_RUNS >> 1];
  writeBlock(
    "latency",
    `\`analyzeTrace\` on the Parkinson's replay (${points.length} points): median ${med.toFixed(1)} ms over ${LATENCY_RUNS} runs in Node on the proof machine.`
  );
}

async function main(): Promise<void> {
  const started = Date.now();
  const conv = await proveConvert();
  proveModel(conv);
  proveTests();
  proveLatency(conv);
  console.log(`${CORE_LOG} proof finished in ${Date.now() - started} ms`);
}

main()
  .catch((err: unknown) => {
    console.log(`${CORE_LOG} proof stopped: ${err instanceof Error ? err.message : "unknown error"}`);
  })
  .finally(() => {
    process.exitCode = 0;
  });
