import type { Metadata } from "next";
import { Suspense } from "react";
import { SceneSlot } from "@/components/scene-slot";
import { SpiralIndex } from "@/components/spiral-index";
import { Card, CardContent } from "@/components/ui/card";
import { getAdapter, type DiarySource } from "@/lib/adapter";
import SpiralsSkeleton from "./loading";

export const metadata: Metadata = { title: "Spirals" };

/** The header line, honest about where the two UCI records come from in this build. */
function sourceIntro(source: DiarySource): string {
  if (source === "uci-395") {
    return "Two days of home readings and two real UCI 395 tablet recordings, one Parkinson's and one control.";
  }
  if (source === "uci-395-pending") {
    return "Two days of home readings and two synthesized stand-ins for the UCI 395 tablet recordings, shown because the recordings have not been converted in this build.";
  }
  return "Two days of home readings and two synthesized stand-ins shaped like UCI 395 tablet recordings, one Parkinson's and one control.";
}

export default function SpiralsPage() {
  const adapter = getAdapter();
  const rows = adapter.listSummaries();
  return (
    <div className="space-y-8">
      <header className="volutra-rise space-y-2">
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Spiral records</h1>
        <p className="max-w-[65ch] text-muted-foreground">
          {sourceIntro(adapter.source)} Open any one to replay it at the speed it was drawn and watch the analysis run again.
        </p>
      </header>

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <Suspense fallback={<SpiralsSkeleton />}>
          <SpiralIndex rows={rows} />
        </Suspense>
        <Card className="volutra-rise overflow-hidden">
          <SceneSlot
            n={2}
            alt="A stylus redrawing a spiral on a dark tablet while a single clay peak rises on a spectrum line beneath it"
            width={960}
            height={720}
          />
          <CardContent className="pt-4 text-sm text-muted-foreground md:pt-5">
            <p>
              Home spirals carry a status from that day&apos;s rule (the first two after the dose set the baseline, 1.5 times
              that is the line), while the UCI replays sit outside the diary as known examples.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
