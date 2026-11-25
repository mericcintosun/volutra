"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CoilStage, type CoilView } from "@/components/coil-stage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { STATUS_LABEL, formatSinceDose, getTest, traceForTest, type TestSummary } from "@/lib/data";
import { coilPath } from "@/lib/tremor";

const STATUS_VARIANT = { baseline: "olive", within: "secondary", past: "bad", replay: "outline" } as const;

/**
 * Signature interaction 1 (K6): today's spirals as one orbitable 3D coil. Picking a time
 * rebuilds the coil from that seed record's trace, and its colour warms with the reading's
 * amplitude against today's line (signature 2).
 */
export function TodayCoil({ tests, thresholdMm }: { tests: TestSummary[]; thresholdMm: number | null }) {
  const initial = tests.find((t) => t.status === "past")?.id ?? tests[tests.length - 1]?.id;
  const [selectedId, setSelectedId] = useState(initial);
  const [view, setView] = useState<CoilView>("drawn");

  const selected = tests.find((t) => t.id === selectedId);
  const geometry = useMemo(() => {
    const test = selectedId ? getTest(selectedId) : undefined;
    return test ? coilPath(traceForTest(test)) : null;
  }, [selectedId]);
  const warmth = selected && thresholdMm ? Math.min(1, Math.max(0, selected.amplitudeMm / thresholdMm)) : undefined;

  return (
    <div className="space-y-4">
      <CoilStage geometry={geometry} view={view} onViewChange={setView} warmth={warmth} />

      <div role="group" aria-label="Pick a spiral from today" className="flex flex-wrap gap-2">
        {tests.map((t) => (
          <Button key={t.id} variant="segment" aria-pressed={t.id === selectedId} onClick={() => setSelectedId(t.id)}>
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
                ? `, above today's ${thresholdMm.toFixed(2)} mm line, so the coil runs hot.`
                : `, under today's ${thresholdMm.toFixed(2)} mm line, so the coil stays cooler.`
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
