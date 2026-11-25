"use client";

import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { SceneSlot } from "@/components/scene-slot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_LABEL, formatSinceDose, getTest, traceForTest, type TestSummary } from "@/lib/data";
import { coilPath } from "@/lib/tremor";

function CoilFallback() {
  return (
    <SceneSlot
      n={1}
      alt="A wavering clay-colored spiral drawn over a dashed olive guide on a fired clay tile, with a small spectrum peak beside it"
      width={960}
      height={640}
      className="h-full w-full object-cover"
    />
  );
}

// Three.js only runs in the browser: load the canvas lazily, show the illustration meanwhile.
const CoilCanvas = dynamic(() => import("@/components/coil-canvas").then((m) => m.CoilCanvas), {
  ssr: false,
  loading: () => <CoilFallback />,
});

class StageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <CoilFallback /> : this.props.children;
  }
}

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") ?? c.getContext("webgl"));
  } catch {
    return false;
  }
}

const STATUS_VARIANT = { baseline: "olive", within: "secondary", past: "bad", replay: "outline" } as const;

/**
 * Signature interaction 1 (K6): today's spirals as one orbitable 3D coil. Picking a time
 * rebuilds the coil from that seed record's trace, so the wobble you see is the tremor
 * the pipeline measured.
 */
export function TodayCoil({ tests, thresholdMm }: { tests: TestSummary[]; thresholdMm: number | null }) {
  const initial = tests.find((t) => t.status === "past")?.id ?? tests[tests.length - 1]?.id;
  const [selectedId, setSelectedId] = useState(initial);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  useEffect(() => setWebgl(hasWebGL()), []);

  const selected = tests.find((t) => t.id === selectedId);
  const geometry = useMemo(() => {
    const test = selectedId ? getTest(selectedId) : undefined;
    return test ? coilPath(traceForTest(test)) : null;
  }, [selectedId]);

  return (
    <div className="space-y-4">
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg border border-border bg-muted">
        {webgl !== true || !geometry ? (
          <CoilFallback />
        ) : (
          <StageBoundary>
            <CoilCanvas drawn={geometry.drawn} ideal={geometry.ideal} heat={geometry.heat} />
          </StageBoundary>
        )}
        <p className="pointer-events-none absolute bottom-2 left-3 text-xs text-muted-foreground">Drag to turn the tile. Wobble shown 3x.</p>
      </div>

      <div role="group" aria-label="Pick a spiral from today" className="flex flex-wrap gap-2">
        {tests.map((t) => (
          <Button
            key={t.id}
            variant="segment"
            aria-pressed={t.id === selectedId}
            onClick={() => setSelectedId(t.id)}
          >
            {t.clock}
          </Button>
        ))}
      </div>

      {selected && (
        <div className="space-y-2 text-sm">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-display text-lg font-semibold">{selected.clock}</span>
            <Badge variant={STATUS_VARIANT[selected.status]}>{STATUS_LABEL[selected.status]}</Badge>
          </p>
          <p className="max-w-[65ch] text-muted-foreground">
            Drawn {selected.minutesSinceDose !== null ? `${formatSinceDose(selected.minutesSinceDose)} after the dose` : ""} on a{" "}
            {selected.device.toLowerCase()}: a {selected.peakHz.toFixed(1)} Hz tremor at {selected.amplitudeMm.toFixed(2)} mm
            {thresholdMm !== null
              ? selected.amplitudeMm >= thresholdMm
                ? `, above today's ${thresholdMm.toFixed(2)} mm line.`
                : `, under today's ${thresholdMm.toFixed(2)} mm line.`
              : "."}{" "}
            <Link href={`/spirals/${selected.id}`} className="kiln-underline text-foreground">
              Open this spiral
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
