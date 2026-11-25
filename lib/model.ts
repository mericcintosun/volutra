import type { SpiralAnalysis } from "./tremor";

// Logistic regression over the same features the browser extracts from a spiral.
//
// STATUS: provisional. The weights below are hand-set so the pipeline runs end to end.
// TODO: swap mock for the trained weights. The training script (see HANDOFF.md, mission
// step 3) extracts these exact features from the UCI 395 static spiral tests, fits a
// class-balanced logistic regression, reports subject-wise cross-validated balanced
// accuracy and writes lib/model-weights.json. Replace FEATURES/BIAS/MODEL_CARD with it.

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
  status: "provisional",
  dataset: "UCI 395, Parkinson Disease Spiral Drawings Using Digitized Graphics Tablet",
  licence: "CC BY 4.0",
  subjects: { parkinsons: 62, control: 15 },
  balancedAccuracy: null,
  folds: null,
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

const FEATURES: Feature[] = [
  { name: "Band amplitude (log mm)", mean: Math.log(0.3), std: 0.9, weight: 1.35, get: (a) => Math.log(Math.max(a.amplitudeMm, 0.01)) },
  { name: "Share of power in 3 to 12 Hz", mean: 0.35, std: 0.2, weight: 0.8, get: (a) => a.bandRatio },
  { name: "Peak distance from 5 Hz", mean: 2, std: 1.5, weight: -0.6, get: (a) => Math.abs(a.peakHz - 5) },
];
const BIAS = -0.3;

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
