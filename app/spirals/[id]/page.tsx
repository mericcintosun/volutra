import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SpiralSession } from "@/components/spiral-session";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, analysisForTest, formatSinceDose, getDoseDay, getTest, summaryFor } from "@/lib/data";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  if (id === "new") return { title: "Draw a spiral" };
  const test = getTest(id);
  return { title: test ? `Spiral at ${test.clock}` : "Spiral not found" };
}

const STATUS_VARIANT = { baseline: "olive", within: "secondary", past: "bad", replay: "outline" } as const;

export default async function SpiralPage({ params }: Params) {
  const { id } = await params;

  if (id === "new") {
    return (
      <div className="space-y-8">
        <header className="volutra-rise space-y-2">
          <h1 className="text-3xl font-semibold md:text-4xl">Draw a spiral</h1>
          <p className="max-w-[68ch] text-muted-foreground">
            Sit with your forearm resting, use the hand you write with, and trace the dashed spiral at a comfortable pace. A
            phone with a finger works. A stylus works better. The whole test takes about 20 seconds.
          </p>
        </header>
        <SpiralSession mode="capture" />
        <p className="max-w-[68ch] text-xs leading-relaxed text-muted-foreground">
          Volutra is a measurement diary to share with your neurologist, not a diagnostic tool. Your drawing is analysed in
          this tab and saved only to this browser&apos;s local storage.
        </p>
      </div>
    );
  }

  const test = getTest(id);
  if (!test) notFound();
  const summary = summaryFor(id);
  const analysis = analysisForTest(test);
  const day = getDoseDay(test.day);
  const sinceDose = summary ? summary.minutesSinceDose : null;

  return (
    <div className="space-y-8">
      <header className="volutra-rise space-y-3">
        <p className="text-sm text-muted-foreground">
          <Link href="/spirals" className="kiln-underline">
            Spirals
          </Link>{" "}
          / {day ? day.label : "UCI 395 replay"}
        </p>
        <h1 className="text-3xl font-semibold md:text-4xl">
          {test.source === "uci" ? `${test.uciGroup} tablet recording` : `Spiral at ${test.clock}`}
        </h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {summary && <Badge variant={STATUS_VARIANT[summary.status]}>{STATUS_LABEL[summary.status]}</Badge>}
          <span>{test.device}</span>
          <span>{test.hand} hand</span>
          {sinceDose !== null && day && (
            <span>
              {formatSinceDose(sinceDose)} after the {day.doseClock} dose
            </span>
          )}
        </div>
        <p className="max-w-[68ch] text-muted-foreground">{test.note}</p>
      </header>

      <SpiralSession mode="replay" testId={test.id} initial={analysis} />
    </div>
  );
}
