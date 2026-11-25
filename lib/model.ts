import weightsJson from "@/fixtures/model-weights.provisional.json";
import type { SpiralAnalysis } from "./tremor";
import type { ModelWeights } from "./types";

// Logistic regression over the same features the browser extracts from a spiral.
//
// STATUS: provisional. The weights in fixtures/model-weights.provisional.json are hand-set
// so the pipeline runs end to end. The mean of the first feature is ln(0.3). Phase 2's
// training script extracts these exact features from the UCI 395 static spiral tests,
// fits a class-balanced logistic regression, reports subject-wise cross-validated balanced
// accuracy and writes the same ModelWeights shape to lib/model-weights.json, which then
// replaces the import above.

const WEIGHTS = weightsJson as unknown as ModelWeights;

export interface ModelCard {
  status: "provisional" | "trained";
  dataset: string;
  licence: string;
  subjects: { parkinsons: number; control: number };
  balancedAccuracy: number | null;
  folds: number | null;
  caveat: string;
}

export const MODEL_CARD: ModelCard = {
  status: WEIGHTS.status,
  dataset: "UCI 395, Parkinson Disease Spiral Drawings Using Digitized Graphics Tablet",
  licence: "CC BY 4.0",
  subjects: { parkinsons: 62, control: 15 },
  balancedAccuracy: WEIGHTS.balancedAccuracy,
  folds: WEIGHTS.folds,
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

/** Feature extractors, keyed by the feature name stored in the weights file. */
const EXTRACTORS: Record<string, (a: SpiralAnalysis) => number> = {
  "Band amplitude (log mm)": (a) => Math.log(Math.max(a.amplitudeMm, 0.01)),
  "Share of power in 3 to 12 Hz": (a) => a.bandRatio,
  "Peak distance from 5 Hz": (a) => Math.abs(a.peakHz - 5),
};

const FEATURES: Feature[] = WEIGHTS.features.map((f) => {
  const get = EXTRACTORS[f.name];
  if (!get) throw new Error(`Unknown model feature: ${f.name}`);
  return { ...f, get };
});
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
