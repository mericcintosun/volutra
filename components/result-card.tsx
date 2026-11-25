import { TriangleAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MODEL_CARD, patientGroupSimilarity } from "@/lib/model";
import { TREMOR_BAND, type SpiralAnalysis, type SpectrumBin } from "@/lib/tremor";
import { cn } from "@/lib/utils";

const W = 420;
const H = 150;
const PAD = { l: 34, r: 10, t: 10, b: 26 };
const MAX_HZ = 15;

/** A second spectrum drawn on the same chart: the device's last drawing or the UCI control recording. */
export interface CompareSeries {
  spectrum: SpectrumBin[];
  peakHz: number;
  /** band amplitude, present for the device drawing */
  amplitudeMm?: number;
  label: string;
}

export type CompareState =
  | "idle"
  | "loading"
  | { kind: "device"; data: CompareSeries }
  | { kind: "control"; data: CompareSeries }
  | "empty"
  | "error";

function pathFor(bins: SpectrumBin[], x: (hz: number) => number, y: (mm: number) => number): string {
  return bins
    .filter((b) => b.hz <= MAX_HZ)
    .map((b, i) => `${i === 0 ? "M" : "L"}${x(b.hz).toFixed(1)} ${y(b.mm).toFixed(1)}`)
    .join(" ");
}

/** Amplitude spectrum of the radial residual, 0 to 15 Hz, tremor band shaded. An optional olive comparison line shares the y scale. */
export function SpectrumChart({
  spectrum,
  peakHz,
  compare,
  className,
}: {
  spectrum: SpectrumBin[];
  peakHz: number;
  compare?: { spectrum: SpectrumBin[] };
  className?: string;
}) {
  const maxMm = Math.max(0.6, ...spectrum.map((b) => b.mm), ...(compare ? compare.spectrum.map((b) => b.mm) : [])) * 1.1;
  const x = (hz: number) => PAD.l + (hz / MAX_HZ) * (W - PAD.l - PAD.r);
  const y = (mm: number) => H - PAD.b - (mm / maxMm) * (H - PAD.t - PAD.b);
  const line = spectrum.map((b, i) => `${i === 0 ? "M" : "L"}${x(b.hz).toFixed(1)} ${y(b.mm).toFixed(1)}`).join(" ");
  const area = spectrum.length ? `${line} L${x(spectrum[spectrum.length - 1].hz).toFixed(1)} ${y(0)} L${x(spectrum[0].hz).toFixed(1)} ${y(0)} Z` : "";
  const compareLine = compare && compare.spectrum.length > 1 ? pathFor(compare.spectrum, x, y) : "";
  const ticks = [0, 3, 6, 9, 12, 15];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Amplitude spectrum with its peak at ${peakHz.toFixed(1)} hertz${compareLine ? ", with a comparison spectrum drawn as a second line" : ""}`}
      className={cn("w-full", className)}
    >
      <rect x={x(TREMOR_BAND.lowHz)} y={PAD.t} width={x(TREMOR_BAND.highHz) - x(TREMOR_BAND.lowHz)} height={H - PAD.t - PAD.b} className="fill-muted" />
      <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} className="stroke-border" />
      <path d={area} className="fill-primary/20" />
      <path d={line} fill="none" strokeWidth={2} strokeLinejoin="round" className="stroke-primary" />
      {compareLine && <path d={compareLine} fill="none" strokeWidth={2} strokeLinejoin="round" className="stroke-second" />}
      <line x1={x(peakHz)} x2={x(peakHz)} y1={PAD.t} y2={y(0)} strokeDasharray="4 4" strokeWidth={1.5} strokeOpacity={0.5} className="stroke-foreground" />
      {ticks.map((t) => (
        <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize={10} className="fill-muted-foreground">
          {t} Hz
        </text>
      ))}
      <text x={4} y={PAD.t + 8} fontSize={10} className="fill-muted-foreground">
        {maxMm.toFixed(1)} mm
      </text>
      <text x={x(TREMOR_BAND.lowHz) + 4} y={PAD.t + 12} fontSize={10} className="fill-muted-foreground">
        tremor band
      </text>
    </svg>
  );
}

function Reading({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-display text-2xl font-semibold">{value}</dd>
      <dd className="text-xs text-muted-foreground">{hint}</dd>
    </div>
  );
}

/** One sentence per compare state, composed from the numbers. */
function compareMessage(state: CompareState, analysis: SpiralAnalysis): string | null {
  if (state === "idle") return null;
  if (state === "loading") return "Looking for your last drawing on this device.";
  if (state === "empty") return 'Draw a spiral with "Draw a spiral" in the rail, then come back: it appears here as an olive line.';
  if (state === "error") return "The last drawing stored on this device could not be read. Draw a new one to compare.";
  if (state.kind === "control") {
    return "No drawing on this device yet, so the UCI control recording is shown. Draw one on the pad and it replaces this line.";
  }
  const mm = state.data.amplitudeMm ?? 0;
  return `Your drawing peaks at ${state.data.peakHz.toFixed(1)} Hz with ${mm.toFixed(2)} mm in the band; this recording reaches ${analysis.amplitudeMm.toFixed(2)} mm.`;
}

function Swatch({ className }: { className: string }) {
  return <span aria-hidden className={cn("inline-block h-1 w-5 shrink-0 rounded-sm", className)} />;
}

export function ResultCard({
  analysis,
  origin,
  compare,
  compareState = "idle",
}: {
  analysis: SpiralAnalysis;
  origin: string;
  compare?: CompareSeries;
  compareState?: CompareState;
}) {
  const series = compare ?? (typeof compareState === "object" ? compareState.data : undefined);
  const message = compareMessage(compareState, analysis);
  const sim = patientGroupSimilarity(analysis);
  const pct = Math.round(sim.score * 100);
  const lowRate = analysis.sampleRateHz < 30;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Result</CardTitle>
        <CardDescription>
          {origin} {analysis.points} points over {analysis.durationS} s, captured at {analysis.sampleRateHz} Hz. Computed in this browser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
          <Reading label="Dominant frequency" value={`${analysis.peakHz.toFixed(1)} Hz`} hint="Peak of the 3 to 12 Hz band" />
          <Reading label="Tremor amplitude" value={`${analysis.amplitudeMm.toFixed(2)} mm`} hint="RMS radial wobble inside the band" />
          <Reading label="Off the ideal line" value={`${analysis.residualRmsMm.toFixed(2)} mm`} hint="All deviation, slow drift included" />
          <Reading label="Spiral fit" value={`r = ${analysis.fit.a} + ${analysis.fit.b}θ`} hint="Least-squares Archimedes fit, mm" />
        </dl>

        {lowRate && (
          <p className="flex items-start gap-2 rounded-lg border border-warn/60 bg-background p-3 text-sm">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
            This device reported fewer than 30 points per second, so frequencies above {(analysis.sampleRateHz / 2).toFixed(0)} Hz cannot be trusted. Try a phone or a stylus.
          </p>
        )}

        <div className="space-y-3">
          <div className="overflow-x-auto">
            <SpectrumChart spectrum={analysis.spectrum} peakHz={analysis.peakHz} compare={series ? { spectrum: series.spectrum } : undefined} />
          </div>
          {series && (
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground" aria-label="Chart legend">
              <li className="flex items-center gap-2">
                <Swatch className="bg-primary" />
                This recording
              </li>
              <li className="flex min-w-0 items-center gap-2">
                <Swatch className="bg-second" />
                <span className="break-all" title={series.label}>
                  {series.label}
                </span>
              </li>
            </ul>
          )}
          {message && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {message}
            </p>
          )}
        </div>

        <div className="space-y-2 border-t border-border pt-5">
          <div className="flex items-baseline justify-between gap-4 text-sm">
            <span>Resemblance to the UCI Parkinson&apos;s group</span>
            <span className="font-display text-lg font-semibold">{pct}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-lg bg-background" aria-hidden>
            <div className="h-full bg-second" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {MODEL_CARD.status === "trained" && MODEL_CARD.balancedAccuracy !== null
              ? `Logistic regression trained on UCI 395 static spirals${MODEL_CARD.subjects ? ` (${MODEL_CARD.subjects.parkinsons} Parkinson's, ${MODEL_CARD.subjects.control} control subjects)` : ""}. Subject-wise ${MODEL_CARD.folds ?? ""}-fold cross-validated balanced accuracy: ${(MODEL_CARD.balancedAccuracy * 100).toFixed(0)}%, measured by the training script.`
              : "Uncalibrated preview. The logistic regression runs on the features above, but its weights are hand-set until the UCI 395 training run replaces them, so no accuracy figure is claimed yet."}{" "}
            {MODEL_CARD.caveat} Not a diagnosis.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
