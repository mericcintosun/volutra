"use client";

import { useState } from "react";
import Link from "next/link";
import { Eraser, Layers, Play, Save } from "lucide-react";
import { ResultCard, type CompareState } from "@/components/result-card";
import { SpiralPad } from "@/components/spiral-pad";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { hashTrace } from "@/lib/cache";
import { readLastSpectrum, saveLocalTestOnce, writeLastSpectrum } from "@/lib/local-diary";
import { analyzeTrace, type SpectrumBin, type SpiralAnalysis, type TracePoint } from "@/lib/tremor";

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
}

/** The core screen: draw (or replay) a spiral, then read the analysis. */
export function SpiralSession({ mode, trace, sourceLine, initial = null, fallbackCompare }: SpiralSessionProps) {
  const [compare, setCompare] = useState<CompareState>("idle");
  const [analysis, setAnalysis] = useState<SpiralAnalysis | null>(initial);
  const [phase, setPhase] = useState<Phase>(initial ? "done" : "idle");
  const [playToken, setPlayToken] = useState(0);
  const [padKey, setPadKey] = useState(0);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [traceKey, setTraceKey] = useState<TracePoint[] | null>(null);
  const [saving, setSaving] = useState(false);

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
    setPadKey((k) => k + 1);
  };

  const status: Record<Phase, string> =
    mode === "capture"
      ? {
          idle: "Put your finger, stylus or cursor on the olive dot and trace the dashed spiral outward without lifting. About 15 seconds.",
          running: "Recording. Keep going to the outer end, then lift.",
          done: "Done. Your reading is on the right. Save it to place it on today's dose timeline.",
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
            onStart={() => setPhase("running")}
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

      {analysis ? (
        <ResultCard
          analysis={analysis}
          origin={mode === "capture" ? "Your drawing:" : "This recording:"}
          compareState={mode === "replay" ? compare : "idle"}
        />
      ) : (
        <Card className="border-dashed">
          <CardContent className="space-y-2 py-10 text-center md:py-12">
            <p className="font-display text-lg font-semibold">No reading yet</p>
            <p className="mx-auto max-w-[48ch] text-sm text-muted-foreground">
              Frequency, amplitude and the spectrum appear here a moment after you lift. Nothing is uploaded: the math runs in this tab.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
