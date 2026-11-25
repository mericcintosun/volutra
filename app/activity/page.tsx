import type { Metadata } from "next";
import { DoseTimeline, type TimelineDay } from "@/components/dose-timeline";
import { SceneSlot } from "@/components/scene-slot";
import { Card, CardContent } from "@/components/ui/card";
import { DOSE_DAYS, summariesForDay } from "@/lib/data";

export const metadata: Metadata = { title: "Dose day" };

export default function ActivityPage() {
  const days: TimelineDay[] = DOSE_DAYS.map((d) => ({
    ...d,
    tests: summariesForDay(d.day).map((t) => ({
      id: t.id,
      clock: t.clock,
      amplitudeMm: t.amplitudeMm,
      peakHz: t.peakHz,
      device: t.device,
      href: `/spirals/${t.id}`,
    })),
  }));

  return (
    <div className="space-y-8">
      <header className="volutra-rise space-y-2">
        <h1 className="text-3xl font-semibold md:text-4xl">Dose day</h1>
        <p className="max-w-[68ch] text-muted-foreground">
          Every reading on one clock, with the dose as the starting line. Change the dose time and the baseline, the threshold
          and the wearing-off mark are recomputed. Print the page or download the CSV for your next appointment.
        </p>
      </header>

      <DoseTimeline days={days} />

      <Card className="overflow-hidden print:hidden">
        <div className="grid items-center md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <SceneSlot
            n={3}
            alt="A printed one-page tremor log on cream paper, its line climbing into a red afternoon band, beside a clay pill and a clock"
            width={960}
            height={640}
          />
          <CardContent className="space-y-3 py-6 text-sm leading-relaxed text-muted-foreground md:py-6">
            <h2 className="text-xl font-semibold text-foreground">Why the dose time matters</h2>
            <p>
              Levodopa fades between doses. Neurologists adjust dose timing from paper on/off diaries kept from memory, and a
              ten-minute clinic visit every three to six months rarely catches the tremor that starts at three in the
              afternoon at home.
            </p>
            <p>A dated chart with a marked time gives that conversation something to point at.</p>
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
