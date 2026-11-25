"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eraser, Layers, Play, Save } from "lucide-react";
import { CoilStage, type CoilView } from "@/components/coil-stage";
import { ResultCard, type CompareState } from "@/components/result-card";
import { SceneSlot } from "@/components/scene-slot";
import { SpiralPad } from "@/components/spiral-pad";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { hashTrace } from "@/lib/cache";
import { readLastSpectrum, saveLocalTestOnce, writeLastSpectrum } from "@/lib/local-diary";
import { analyzeTrace, coilPath, type SpectrumBin, type SpiralAnalysis, type TracePoint } from "@/lib/tremor";

type Phase = "idle" | "running" | "done" | "short";

interface SpiralSessionProps {
  mode: "capture" | "replay";
  /** replay only: the recording's points, chosen on the server through the adapter */
  trace?: TracePoint[];
  /** replay only: where the points came from (converted UCI 395 file or a stand-in) */
  sourceLine?: string;
  initial?: SpiralAnalysis | null;
  /** replay only: drawn when this device holds no drawing (the UCI control recording) */
  fallbackCompare?: { spectrum: SpectrumBin[]; peakHz: number; label: string };
  /** capture only: today's wearing-off line from the seed day (assessDay), in mm */
  thresholdMm?: number | null;
}

/** The core screen: draw (or replay) a spiral, then read the analysis and turn the coil. */
export function SpiralSession({ mode, trace, sourceLine, initial = null, fallbackCompare, thresholdMm = null }: SpiralSessionProps) {
  const [compare, setCompare] = useState<CompareState>("idle");
  const [analysis, setAnalysis] = useState<SpiralAnalysis | null>(initial);
  const [phase, setPhase] = useState<Phase>(initial ? "done" : "idle");
  const [playToken, setPlayToken] = useState(0);
  const [padKey, setPadKey] = useState(0);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [traceKey, setTraceKey] = useState<TracePoint[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewOverride, setViewOverride] = useState<CoilView | null>(null);

  // signature 3: the camera follows the session step; the buttons override it until the next step
  const stepView: CoilView = phase === "done" ? "relief" : "drawn";
  const view = viewOverride ?? stepView;

  // replay: the recording's coil; capture: the coil of the points just drawn
  const geometry = useMemo(() => {
    if (mode === "replay") return trace ? coilPath(trace) : null;
    return traceKey ? coilPath(traceKey) : null;
  }, [mode, trace, traceKey]);

  // signature 2: warmth = clamp(amplitude / today's line), capture only
  const warmth =
    mode === "capture" && analysis && thresholdMm ? Math.min(1, Math.max(0, analysis.amplitudeMm / thresholdMm)) : undefined;

  const handleStart = () => {
    setViewOverride(null);
    setPhase("running");
  };

  const handleComplete = (points: TracePoint[]) => {
    const result = analyzeTrace(points);
    if (!result) {
      setPhase("short");
      return;
    }
    // capture only: keep this drawing's spectrum so a replay can compare against it (Save not needed)
    if (mode === "capture") writeLastSpectrum(result);
    setTraceKey(points);
    setAnalysis(result);
    setViewOverride(null);
    setPhase("done");
  };

  const toggleCompare = () => {
    if (compare !== "idle") {
      setCompare("idle");
      return;
    }
    setCompare("loading");
    // let the loading line paint before the storage read
    window.setTimeout(() => {
      try {
        const last = readLastSpectrum();
        if (last) {
          setCompare({
            kind: "device",
            data: { spectrum: last.spectrum, peakHz: last.peakHz, amplitudeMm: last.amplitudeMm, label: `Your drawing at ${last.clock}` },
          });
        } else if (fallbackCompare) {
          setCompare({ kind: "control", data: fallbackCompare });
        } else {
          setCompare("empty");
        }
      } catch {
        setCompare("error");
      }
    }, 0);
  };

  const handleSave = () => {
    if (!analysis || !traceKey || saving || savedAt !== null) return;
    setSaving(true);
    try {
      // keyed by the trace content, so a second press finds the first entry and writes nothing
      setSavedAt(saveLocalTestOnce(analysis, hashTrace(traceKey)).clock);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setAnalysis(null);
    setPhase("idle");
    setSavedAt(null);
    setTraceKey(null);
    setViewOverride(null);
    setPadKey((k) => k + 1);
  };

  const warmthLine =
    analysis && thresholdMm
      ? analysis.amplitudeMm >= thresholdMm
        ? `${analysis.amplitudeMm.toFixed(2)} mm, at or over today's ${thresholdMm.toFixed(2)} mm line, so the coil runs clay with red heat.`
        : `${analysis.amplitudeMm.toFixed(2)} mm, under today's ${thresholdMm.toFixed(2)} mm line, so the coil stays toward olive.`
      : analysis
        ? `${analysis.amplitudeMm.toFixed(2)} mm in the tremor band. No line is set for today, so the coil keeps its clay colour.`
        : null;

  const status: Record<Phase, string> =
    mode === "capture"
      ? {
          idle: "Put your finger, stylus or cursor on the olive dot and trace the dashed spiral outward without lifting. About 15 seconds.",
          running: "Recording. Keep going to the outer end, then lift.",
          done: "Done. Your reading and your coil are beside the pad. Save the reading to place it on today's dose timeline.",
          short: "That trace was too short to measure. Draw at least two full turns, for two seconds or more.",
        }
      : {
          idle: "Press replay to redraw this recording at the speed it was drawn.",
          running: "Replaying at recorded speed. The analysis reruns on the same points when it finishes.",
          done: "Analysis of this recording, computed from its timestamped points.",
          short: "This recording is too short to measure.",
        };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <Card className="overflow-hidden">
        <CardContent className="flex flex-col items-center gap-4 pt-5 md:pt-6">
          <SpiralPad
            key={padKey}
            mode={mode}
            trace={trace}
            playToken={playToken}
            onStart={handleStart}
            onComplete={handleComplete}
          />
          <p className="max-w-[44ch] text-sm text-muted-foreground" aria-live="polite">
            {status[phase]}
          </p>
          {sourceLine && (
            <p className="max-w-full break-all text-xs text-muted-foreground sm:max-w-[44ch] sm:break-words" title={sourceLine}>
              {sourceLine}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex-wrap">
          {mode === "replay" ? (
            <>
              <Button onClick={() => setPlayToken((n) => n + 1)} disabled={phase === "running"}>
                <Play aria-hidden />
                {playToken === 0 ? "Replay recording" : "Replay again"}
              </Button>
              <Button variant="outline" onClick={toggleCompare} disabled={phase !== "done"} aria-pressed={compare !== "idle"}>
                <Layers aria-hidden />
                {compare === "idle" ? "Compare with my last drawing" : "Hide comparison"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={reset} disabled={phase === "idle"}>
                <Eraser aria-hidden />
                Clear
              </Button>
              <Button onClick={handleSave} disabled={phase !== "done" || saving || savedAt !== null}>
                <Save aria-hidden />
                {savedAt ? `Saved at ${savedAt}` : "Save to today"}
              </Button>
              {savedAt && (
                <Link href="/activity" className="kiln-underline text-sm">
                  See it on the dose day
                </Link>
              )}
            </>
          )}
        </CardFooter>
      </Card>

      <div className="space-y-6">
        {analysis ? (
          <ResultCard
            analysis={analysis}
            origin={mode === "capture" ? "Your drawing:" : "This recording:"}
            compareState={mode === "replay" ? compare : "idle"}
          />
        ) : (
          <Card className="overflow-hidden">
            <SceneSlot
              n={4}
              alt="An empty drawing pad on a brown tile with a dashed olive guide spiral, an olive start dot and a resting clay stylus"
              width={640}
              height={640}
              className="mx-auto max-w-sm"
            />
            <CardContent className="space-y-1 pt-4 md:pt-5">
              <p className="font-display text-lg font-semibold">No reading yet</p>
              <p className="max-w-[48ch] text-sm text-muted-foreground">
                Your frequency, amplitude, spectrum and coil appear here a moment after you lift, computed in this tab.
              </p>
            </CardContent>
          </Card>
        )}

        {geometry && (mode === "replay" || phase === "done") && (
          <Card>
            <CardHeader>
              <h2 className="font-display text-xl font-semibold leading-tight">
                {mode === "capture" ? "Your spiral, as fired clay" : "This recording, as fired clay"}
              </h2>
            </CardHeader>
            <CardContent className="space-y-3">
              <CoilStage geometry={geometry} view={view} onViewChange={setViewOverride} warmth={warmth} />
              <p className="max-w-[65ch] text-sm text-muted-foreground" aria-live="polite">
                {mode === "capture"
                  ? warmthLine
                  : phase === "running"
                    ? "Seen from above, as drawn, while the recording replays."
                    : "Turned on its side when the replay ends, so the tremor stands up from the tile as relief."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
