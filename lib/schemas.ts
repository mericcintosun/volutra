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

export type UciRecording = z.infer<typeof UciRecordingSchema>;
export type UciManifest = z.infer<typeof UciManifestSchema>;
