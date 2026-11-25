import type { Metadata } from "next";
import { DoseTimeline, type TimelineDay } from "@/components/dose-timeline";
import { SceneSlot } from "@/components/scene-slot";
import { Card, CardContent } from "@/components/ui/card";
import { getAdapter } from "@/lib/adapter";

export const metadata: Metadata = { title: "Dose day" };

type Props = { searchParams: Promise<{ day?: string | string[] }> };

export default async function ActivityPage({ searchParams }: Props) {
  const { day: dayParam } = await searchParams;
  const requested = typeof dayParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dayParam) ? dayParam : undefined;
  const adapter = getAdapter();
  const days: TimelineDay[] = adapter.listDays().map((d) => ({
    ...d,
    tests: adapter.summariesForDay(d.day).map((t) => ({
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
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Dose day</h1>
        <p className="max-w-[65ch] text-muted-foreground">
          Every reading on one clock with the dose as the starting line; change the dose time and every mark is recomputed.
        </p>
      </header>

      <DoseTimeline days={days} initialDay={requested ?? days[0]?.day} />

      <Card className="overflow-hidden print:hidden">
        <div className="grid items-center md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <SceneSlot
            n={3}
            alt="A printed one-page tremor log on cream paper, its line climbing into a red afternoon band, beside a clay pill and a clock"
            width={960}
            height={640}
          />
          <CardContent className="space-y-3 py-6 text-sm leading-relaxed text-muted-foreground md:py-6">
            <h2 className="font-display text-xl font-semibold text-foreground">Why the dose time matters</h2>
            <p className="max-w-[65ch]">
              Dose timing is adjusted from paper diaries kept from memory, and a dated chart with a marked time gives that
              clinic conversation something to point at.
            </p>
          </CardContent>
        </div>
      </Card>

      <Card className="overflow-hidden print:hidden">
        <SceneSlot
          n={5}
          alt="A wide clay-brown desk with a printed tremor chart, a fired clay coil and an olive guide line running toward a clinic calendar"
          width={1200}
          height={400}
        />
        <CardContent className="pt-4 text-sm text-muted-foreground md:pt-5">
          <h2 className="font-display text-xl font-semibold text-foreground">This page goes to the next appointment</h2>
          <p className="mt-2 max-w-[65ch]">
            Press &ldquo;Print for the neurologist&rdquo; at the top of this page for a one-page A4 log; nothing leaves the device
            until you hand it over.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
