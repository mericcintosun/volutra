import type { SpiralAnalysis } from "./tremor";

// The model's features, shared by the browser scorer (lib/model.ts) and the training
// script (scripts/train-model.ts) so both read a spiral the same way. Pure: no JSON import.

/** Feature extractors, keyed by the feature name stored in the weights file. */
export const FEATURE_EXTRACTORS: Record<string, (a: SpiralAnalysis) => number> = {
  "Band amplitude (log mm)": (a) => Math.log(Math.max(a.amplitudeMm, 0.01)),
  "Share of power in 3 to 12 Hz": (a) => a.bandRatio,
  "Peak distance from 5 Hz": (a) => Math.abs(a.peakHz - 5),
};

export const FEATURE_NAMES: string[] = Object.keys(FEATURE_EXTRACTORS);

/** The feature values in FEATURE_NAMES order. */
export function featureVector(a: SpiralAnalysis): number[] {
  return FEATURE_NAMES.map((name) => FEATURE_EXTRACTORS[name](a));
}

/** One subject's static spiral test, as handed from the converter to the trainer. */
export interface SubjectFeatures {
  /** path of the subject file inside the UCI 395 archive */
  file: string;
  group: "parkinsons" | "control";
  features: number[];
}
