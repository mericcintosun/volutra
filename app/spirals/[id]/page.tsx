import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SpiralSession } from "@/components/spiral-session";
import { Badge } from "@/components/ui/badge";
import { getAdapter } from "@/lib/adapter";
import { STATUS_LABEL, WEARING_OFF_RATIO, analysisForTest, assessDay, formatSinceDose, traceForTest } from "@/lib/data";
import type { DiaryAdapter, DiarySource, SpiralTest } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  if (id === "new") return { title: "Draw a spiral" };
  const test = getAdapter().getTest(id);
  return { title: test ? `Spiral at ${test.clock}` : "Spiral not found" };
}

const CONTROL_COMPARE_ID = "uci-ctl-sst-02";

const STATUS_VARIANT ={ baseline: "olive", within: "secondary", past: "bad", replay: "outline" } as const;

/** The line under the pad that says where the points came from, driven by adapter.source. */
function sourceLineFor(source: DiarySource, test: SpiralTest): string {
  // Home spirals are the example diary by design (there is no upstream to fetch them from), so
  // this line names what the record is instead of reading like a failed live source.
  if (test.source !== "uci") return "Example diary: this home spiral is synthesized so the dose day has readings before you draw your own.";
  if (source === "uci-395" && test.recording) {
    return `Real recording: UCI 395 subject file ${test.recording.subjectFile}, Wacom tablet, CC BY 4.0. Amplitude ${test.recording.unitsNote}.`;
  }
  if (source === "seed") return "Sample data: a synthesized stand-in shaped like a UCI 395 static spiral.";
  return "Sample data: the UCI 395 recording has not been converted in this build, so a synthesized stand-in is shown.";
}

/** Today's wearing-off line: the newest seed dose day (Tue 24 Nov) run through assessDay. */
function todayThresholdMm(adapter: DiaryAdapter): number | null {
  const [today] = adapter.listDays();
  if (!today) return null;
  const verdict = assessDay(adapter.summariesForDay(today.day), today.doseClock, WEARING_OFF_RATIO, today.nextDoseClock || undefined);
  return verdict.thresholdMm;
}

export default async function SpiralPage({ params }: Params) {
  const { id } = await params;

  if (id === "new") {
    return (
      <div className="space-y-8">
        <header className="volutra-rise space-y-2">
          <h1 className="font-display text-3xl font-semibold md:text-4xl">Draw a spiral</h1>
          <p className="max-w-[65ch] text-muted-foreground">
            Rest your forearm, use the hand you write with, and trace the dashed spiral for about 20 seconds.
          </p>
        </header>
        <SpiralSession mode="capture" thresholdMm={todayThresholdMm(getAdapter())} />
        <p className="max-w-[65ch] text-xs leading-relaxed text-muted-foreground">
          Volutra is a measurement diary to share with your neurologist, not a diagnostic tool. Your drawing is analysed in
          this tab and saved only to this browser&apos;s local storage.
        </p>
      </div>
    );
  }

  const adapter = getAdapter();
  const test = adapter.getTest(id);
  if (!test) notFound();
  const summary = adapter.getSummary(id);
  const analysis = analysisForTest(test);
  const day = adapter.listDays().find((d) => d.day === test.day);
  const sinceDose = summary ? summary.minutesSinceDose : null;

  // Parkinson's replays compare against the UCI control recording when this device holds no drawing
  const controlTest = id.startsWith("uci-pwp-") ? adapter.getTest(CONTROL_COMPARE_ID) : undefined;
  const control = controlTest ? analysisForTest(controlTest) : null;
  const fallbackCompare = control
    ? { spectrum: control.spectrum, peakHz: control.peakHz, label: `UCI control recording ${CONTROL_COMPARE_ID}` }
    : undefined;

  return (
    <div className="space-y-8">
      <header className="volutra-rise space-y-3">
        <p className="text-sm text-muted-foreground">
          <Link href="/spirals" className="kiln-underline">
            Spirals
          </Link>{" "}
          / {day ? day.label : "UCI 395 replay"}
        </p>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">
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
        <p className="max-w-[65ch] text-muted-foreground">{test.note}</p>
      </header>

      <SpiralSession
        mode="replay"
        trace={traceForTest(test)}
        sourceLine={sourceLineFor(adapter.source, test)}
        initial={analysis}
        fallbackCompare={fallbackCompare}
      />
    </div>
  );
}
