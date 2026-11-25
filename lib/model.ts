import provisionalJson from "../fixtures/model-weights.provisional.json";
import { CORE_LOG } from "./log";
import { FEATURE_EXTRACTORS } from "./features";
import weightsJson from "./model-weights.json";
import { ModelWeightsSchema } from "./schemas";
import type { SpiralAnalysis } from "./tremor";
import type { ModelWeights } from "./types";

// Logistic regression over the same features the browser extracts from a spiral.
//
// lib/model-weights.json starts as a copy of the hand-set provisional weights. The training
// script (scripts/train-model.ts, run by `npm run proof`) extracts these exact features from
// the UCI 395 static spiral tests, fits a class-balanced logistic regression, measures
// subject-wise cross-validated balanced accuracy and rewrites that file with
// status "trained". The file is validated with zod; if it fails, the committed provisional
// fixture is used and the UI says so.

function usable(w: ModelWeights): boolean {
  return w.features.every((f) => f.name in FEATURE_EXTRACTORS);
}

function loadWeights(): ModelWeights {
  const parsed = ModelWeightsSchema.safeParse(weightsJson);
  if (parsed.success && usable(parsed.data)) return parsed.data;
  console.warn(`${CORE_LOG} model weights parse failure, using the provisional fixture`);
  const fallback = ModelWeightsSchema.parse(provisionalJson);
  return { ...fallback, status: "provisional", balancedAccuracy: null, folds: null, subjects: null };
}

const WEIGHTS = loadWeights();

export interface ModelCard {
  status: "provisional" | "trained";
  dataset: string;
  licence: string;
  /** subject counts from the training run; null until weights are trained */
  subjects: { parkinsons: number; control: number } | null;
  balancedAccuracy: number | null;
  folds: number | null;
  trainedAt: string | null;
  caveat: string;
}

export const MODEL_CARD: ModelCard = {
  status: WEIGHTS.status,
  dataset: "UCI 395, Parkinson Disease Spiral Drawings Using Digitized Graphics Tablet",
  licence: "CC BY 4.0",
  subjects: WEIGHTS.subjects ?? null,
  balancedAccuracy: WEIGHTS.balancedAccuracy,
  folds: WEIGHTS.folds,
  trainedAt: WEIGHTS.trainedAt ?? null,
  caveat:
    "Trained on Wacom tablet recordings. Finger and trackpad drawings come from a different distribution, so treat this as a secondary signal. Frequency and amplitude are the primary readings.",
};

interface Feature {
  name: string;
  mean: number;
  std: number;
  weight: number;
  get: (a: SpiralAnalysis) => number;
}

const FEATURES: Feature[] = WEIGHTS.features.map((f) => ({ ...f, get: FEATURE_EXTRACTORS[f.name] }));
const BIAS = WEIGHTS.bias;

export interface Similarity {
  score: number;
  contributions: { name: string; value: number }[];
}

/** Probability-like resemblance to the dataset's Parkinson's group. Not a diagnosis. */
export function patientGroupSimilarity(a: SpiralAnalysis): Similarity {
  let z = BIAS;
  const contributions = FEATURES.map((f) => {
    const value = (f.weight * (f.get(a) - f.mean)) / f.std;
    z += value;
    return { name: f.name, value: +value.toFixed(2) };
  });
  return { score: 1 / (1 + Math.exp(-z)), contributions };
}
