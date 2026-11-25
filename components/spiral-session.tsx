"use client";

import { useState } from "react";
import Link from "next/link";
import { Eraser, Play, Save } from "lucide-react";
import { ResultCard } from "@/components/result-card";
import { SpiralPad } from "@/components/spiral-pad";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { saveLocalTest } from "@/lib/local-diary";
import { analyzeTrace, type SpiralAnalysis, type TracePoint } from "@/lib/tremor";

type Phase = "idle" | "running" | "done" | "short";

interface SpiralSessionProps {
  mode: "capture" | "replay";
  /** replay only: the recording's points, chosen on the server through the adapter */
  trace?: TracePoint[];
  /** replay only: where the points came from (converted UCI 395 file or a stand-in) */
  sourceLine?: string;
  initial?: SpiralAnalysis | null;
}

/** The core screen: draw (or replay) a spiral, then read the analysis. */
export function SpiralSession({ mode, trace, sourceLine, initial = null }: SpiralSessionProps) {
  const [analysis, setAnalysis] = useState<SpiralAnalysis | null>(initial);
  const [phase, setPhase] = useState<Phase>(initial ? "done" : "idle");
  const [playToken, setPlayToken] = useState(0);
  const [padKey, setPadKey] = useState(0);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const handleComplete = (points: TracePoint[]) => {
    const result = analyzeTrace(points);
    if (!result) {
      setPhase("short");
      return;
    }
    setAnalysis(result);
    setPhase("done");
  };

  const handleSave = () => {
    if (!analysis) return;
    setSavedAt(saveLocalTest(analysis).clock);
  };

  const reset = () => {
    setAnalysis(null);
    setPhase("idle");
    setSavedAt(null);
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
          {sourceLine && <p className="max-w-[44ch] text-xs text-muted-foreground">{sourceLine}</p>}
        </CardContent>
        <CardFooter className="flex-wrap">
          {mode === "replay" ? (
            <Button onClick={() => setPlayToken((n) => n + 1)} disabled={phase === "running"}>
              <Play aria-hidden />
              {playToken === 0 ? "Replay recording" : "Replay again"}
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={reset} disabled={phase === "idle"}>
                <Eraser aria-hidden />
                Clear
              </Button>
              <Button onClick={handleSave} disabled={phase !== "done" || savedAt !== null}>
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
        <ResultCard analysis={analysis} origin={mode === "capture" ? "Your drawing:" : "This recording:"} />
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
