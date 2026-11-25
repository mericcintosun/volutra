"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { SceneSlot } from "@/components/scene-slot";
import { Button } from "@/components/ui/button";
import type { CoilView } from "@/components/coil-canvas";
import type { Vec3 } from "@/lib/tremor";

export type { CoilView };

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
const CoilCanvas = dynamic(() => import("@/components/coil-canvas").then((mod) => mod.CoilCanvas), {
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

export interface CoilGeometry {
  drawn: Vec3[];
  ideal: Vec3[];
  heat: number[];
}

interface CoilStageProps {
  geometry: CoilGeometry | null;
  view: CoilView;
  onViewChange: (view: CoilView) => void;
  /** clamp(amplitudeMm / thresholdMm, 0, 1); see CoilCanvas */
  warmth?: number;
}

/**
 * The coil frame shared by the overview and the drawing session: the lazily loaded
 * canvas inside an error boundary, the SVG fallback when WebGL is missing, and the two
 * view buttons that are the keyboard alternative to dragging.
 */
export function CoilStage({ geometry, view, onViewChange, warmth }: CoilStageProps) {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  useEffect(() => setWebgl(hasWebGL()), []);
  const live = webgl === true && geometry !== null;

  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg border border-border bg-muted">
        {webgl === true && geometry ? (
          <StageBoundary>
            <CoilCanvas drawn={geometry.drawn} ideal={geometry.ideal} heat={geometry.heat} warmth={warmth} view={view} />
          </StageBoundary>
        ) : (
          <CoilFallback />
        )}
      </div>
      {live ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div role="group" aria-label="Camera view" className="flex gap-2">
            <Button variant="segment" aria-pressed={view === "drawn"} onClick={() => onViewChange("drawn")}>
              As drawn
            </Button>
            <Button variant="segment" aria-pressed={view === "relief"} onClick={() => onViewChange("relief")}>
              Side relief
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Drag to turn the tile, or pick a view. Wobble shown 3x.</p>
        </div>
      ) : (
        webgl === false && <p className="text-xs text-muted-foreground">This browser has no WebGL, so an illustration stands in for the coil.</p>
      )}
    </div>
  );
}
