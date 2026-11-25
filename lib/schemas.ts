import { z } from "zod";

// zod schemas for every edge where outside data enters: route params, the converted UCI
// manifest and the trained weights file.

export const SpiralIdSchema = z.union([z.literal("new"), z.string().regex(/^[a-z0-9-]{3,40}$/)]);

export const TracePointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  t: z.number().finite(),
});

export const UciRecordingSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{3,40}$/),
  group: z.enum(["parkinsons", "control"]),
  subjectFile: z.string().min(1),
  unitsNote: z.string().min(1),
  sampleRateHz: z.number().positive(),
  points: z.array(TracePointSchema).min(64),
});

export const UciManifestSchema = z.object({
  status: z.enum(["converted", "not-converted"]),
  convertedAt: z.string().nullable(),
  source: z.string(),
  recordings: z.array(UciRecordingSchema),
});

export const ModelWeightsSchema = z.object({
  status: z.enum(["provisional", "trained"]),
  features: z
    .array(
      z.object({
        name: z.string(),
        mean: z.number().finite(),
        std: z.number().finite().positive(),
        weight: z.number().finite(),
      })
    )
    .min(1),
  bias: z.number().finite(),
  balancedAccuracy: z.number().min(0).max(1).nullable(),
  folds: z.number().int().positive().nullable(),
  subjects: z
    .object({ parkinsons: z.number().int().nonnegative(), control: z.number().int().nonnegative() })
    .nullable()
    .optional(),
  trainedAt: z.string().nullable().optional(),
  testsUsed: z.number().int().nonnegative().nullable().optional(),
});

/** One reading saved from the drawing pad into this browser's storage (lib/local-diary.ts). */
export const LocalTestSchema = z.object({
  id: z.string().min(1),
  key: z.string().min(1),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  clock: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  peakHz: z.number().finite(),
  amplitudeMm: z.number().finite(),
  sampleRateHz: z.number().finite(),
});

export const LocalTestsSchema = z.array(LocalTestSchema);

/** Dose clock overrides keyed by diary day, each an HH:MM string. */
export const DoseClocksSchema = z.record(z.string(), z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/));

/**
 * The spectrum of the last spiral drawn on this device (0 to 15 Hz bins), kept so a replay
 * can draw it on the same chart. Field names match SpectrumBin in lib/tremor.ts.
 */
export const LastSpectrumSchema = z.object({
  clock: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  peakHz: z.number().finite(),
  amplitudeMm: z.number().finite(),
  spectrum: z.array(z.object({ hz: z.number().finite(), mm: z.number().finite() })).min(2).max(2048),
});

export type LocalTest = z.infer<typeof LocalTestSchema>;
export type LastSpectrum = z.infer<typeof LastSpectrumSchema>;
export type UciRecording = z.infer<typeof UciRecordingSchema>;
export type UciManifest = z.infer<typeof UciManifestSchema>;
