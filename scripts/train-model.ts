import { mkdirSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { CORE_LOG, CV_FOLDS, TRAIN_ITERATIONS, TRAIN_LEARNING_RATE } from "../lib/config";
import { FEATURE_NAMES, type SubjectFeatures } from "../lib/features";
import { ModelWeightsSchema } from "../lib/schemas";
import type { ModelWeights } from "../lib/types";
import { convertUci } from "./convert-uci";

// Class-balanced logistic regression on the UCI 395 static spiral features, with
// subject-wise stratified k-fold cross-validation. Each subject file holds one static spiral
// test, so a subject never sits in both the training and the test fold. Balanced accuracy is
// computed on the pooled out-of-fold predictions, then the model is refit on every subject and
// written to lib/model-weights.json. Run with `npm run train` (it converts first).

const WEIGHTS_PATH = path.join("lib", "model-weights.json");

export type TrainResult =
  | {
      ok: true;
      balancedAccuracy: number;
      folds: number;
      subjects: { parkinsons: number; control: number };
      testsUsed: number;
      weights: ModelWeights;
    }
  | { ok: false; reason: string };

interface Scaler {
  mean: number[];
  std: number[];
}

function fitScaler(X: number[][]): Scaler {
  const d = X[0].length;
  const mean = new Array<number>(d).fill(0);
  const std = new Array<number>(d).fill(0);
  for (const row of X) for (let j = 0; j < d; j++) mean[j] += row[j] / X.length;
  for (const row of X) for (let j = 0; j < d; j++) std[j] += (row[j] - mean[j]) ** 2 / X.length;
  for (let j = 0; j < d; j++) {
    std[j] = Math.sqrt(std[j]);
    if (!(std[j] > 1e-9)) std[j] = 1;
  }
  return { mean, std };
}

const scale = (row: number[], s: Scaler) => row.map((v, j) => (v - s.mean[j]) / s.std[j]);
const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/** Gradient descent from zero weights on the class-balanced mean log loss. */
function fitLogistic(X: number[][], y: number[]): { w: number[]; b: number } {
  const n = X.length;
  const d = X[0].length;
  const pos = y.filter((v) => v === 1).length;
  const neg = n - pos;
  const sw = y.map((v) => (v === 1 ? n / (2 * Math.max(pos, 1)) : n / (2 * Math.max(neg, 1))));
  const w = new Array<number>(d).fill(0);
  let b = 0;
  for (let it = 0; it < TRAIN_ITERATIONS; it++) {
    const gw = new Array<number>(d).fill(0);
    let gb = 0;
    for (let i = 0; i < n; i++) {
      let z = b;
      for (let j = 0; j < d; j++) z += w[j] * X[i][j];
      const err = sw[i] * (sigmoid(z) - y[i]);
      for (let j = 0; j < d; j++) gw[j] += (err * X[i][j]) / n;
      gb += err / n;
    }
    for (let j = 0; j < d; j++) w[j] -= TRAIN_LEARNING_RATE * gw[j];
    b -= TRAIN_LEARNING_RATE * gb;
  }
  return { w, b };
}

function predict(row: number[], m: { w: number[]; b: number }): number {
  let z = m.b;
  for (let j = 0; j < row.length; j++) z += m.w[j] * row[j];
  return sigmoid(z);
}

/** Fold per subject: within each class, sorted by file name, fold = index mod k. */
function assignFolds(subjects: SubjectFeatures[], k: number): Map<string, number> {
  const folds = new Map<string, number>();
  for (const group of ["parkinsons", "control"] as const) {
    subjects
      .filter((s) => s.group === group)
      .map((s) => s.file)
      .sort((a, b) => a.localeCompare(b))
      .forEach((file, i) => folds.set(file, i % k));
  }
  return folds;
}

export function trainModel(subjectFeatures: SubjectFeatures[]): TrainResult {
  const subjects = subjectFeatures.filter((s) => s.features.length === FEATURE_NAMES.length && s.features.every(Number.isFinite));
  const counts = {
    parkinsons: subjects.filter((s) => s.group === "parkinsons").length,
    control: subjects.filter((s) => s.group === "control").length,
  };
  if (counts.parkinsons < CV_FOLDS || counts.control < CV_FOLDS) {
    return { ok: false, reason: `each group needs at least ${CV_FOLDS} subjects, found ${counts.parkinsons} Parkinson's and ${counts.control} control` };
  }

  const foldOf = assignFolds(subjects, CV_FOLDS);
  let tp = 0;
  let fn = 0;
  let tn = 0;
  let fp = 0;
  for (let k = 0; k < CV_FOLDS; k++) {
    const train = subjects.filter((s) => foldOf.get(s.file) !== k);
    const test = subjects.filter((s) => foldOf.get(s.file) === k);
    const scaler = fitScaler(train.map((s) => s.features));
    const model = fitLogistic(
      train.map((s) => scale(s.features, scaler)),
      train.map((s) => (s.group === "parkinsons" ? 1 : 0))
    );
    for (const s of test) {
      const yes = predict(scale(s.features, scaler), model) >= 0.5;
      if (s.group === "parkinsons") {
        if (yes) tp++;
        else fn++;
      } else if (yes) fp++;
      else tn++;
    }
  }
  const balancedAccuracy = (tp / (tp + fn) + tn / (tn + fp)) / 2;

  const scaler = fitScaler(subjects.map((s) => s.features));
  const model = fitLogistic(
    subjects.map((s) => scale(s.features, scaler)),
    subjects.map((s) => (s.group === "parkinsons" ? 1 : 0))
  );
  const weights: ModelWeights = {
    status: "trained",
    features: FEATURE_NAMES.map((name, j) => ({
      name,
      mean: +scaler.mean[j].toFixed(6),
      std: +scaler.std[j].toFixed(6),
      weight: +model.w[j].toFixed(6),
    })),
    bias: +model.b.toFixed(6),
    balancedAccuracy: +balancedAccuracy.toFixed(4),
    folds: CV_FOLDS,
    subjects: counts,
    trainedAt: new Date().toISOString(),
    testsUsed: subjects.length,
  };

  const check = ModelWeightsSchema.safeParse(weights);
  if (!check.success) {
    console.log(`${CORE_LOG} train weights parse failure before write`);
    return { ok: false, reason: "the trained weights did not pass their schema" };
  }
  const outPath = path.resolve(WEIGHTS_PATH);
  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(weights, null, 2)}\n`);
  console.log(
    `${CORE_LOG} train parkinsons=${counts.parkinsons} control=${counts.control} folds=${CV_FOLDS} balancedAccuracy=${balancedAccuracy.toFixed(3)}`
  );
  return { ok: true, balancedAccuracy, folds: CV_FOLDS, subjects: counts, testsUsed: subjects.length, weights };
}

function isDirectRun(file: string): boolean {
  const entry = (process.argv[1] ?? "").split(path.sep).join("/");
  return entry.endsWith(file) || entry.endsWith(file.replace(/\.ts$/, ""));
}

if (isDirectRun("scripts/train-model.ts")) {
  convertUci().then(
    (conv) => {
      if (!conv.ok) {
        console.log(`Not trained: ${conv.reason}.`);
        process.exitCode = 1;
        return;
      }
      const r = trainModel(conv.subjects);
      if (r.ok) console.log(`Balanced accuracy ${r.balancedAccuracy.toFixed(3)} over ${r.folds} folds.`);
      else {
        console.log(`Not trained: ${r.reason}.`);
        process.exitCode = 1;
      }
    },
    (err: unknown) => {
      console.log(`Not trained: ${err instanceof Error ? err.message : "unknown error"}.`);
      process.exitCode = 1;
    }
  );
}
