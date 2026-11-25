import type { Metadata } from "next";
import Link from "next/link";
import { TodayCoil } from "@/components/today-coil";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdapter } from "@/lib/adapter";
import { DEMO_PERSON, WEARING_OFF_RATIO, assessDay, formatSinceDose } from "@/lib/data";

export const metadata: Metadata = { title: "Overview" };

export default function Overview() {
  const adapter = getAdapter();
  const [today, yesterday] = adapter.listDays();

  if (!today) {
    return (
      <div className="space-y-8">
        <header className="volutra-rise space-y-3">
          <h1 className="text-3xl font-semibold leading-tight md:text-4xl">Welcome to your spiral diary</h1>
        </header>
        <Card className="volutra-rise max-w-2xl">
          <CardContent className="space-y-3 py-8 text-sm leading-relaxed text-muted-foreground">
            <p>
              There are no diary days yet. Use &ldquo;Draw a spiral&rdquo; in the rail to take your first 20-second reading.
              After a dose and a few readings, this page shows the hour the dose started wearing off.
            </p>
            <p>Volutra is a measurement diary, not a diagnostic tool. Every reading stays in this browser.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tests = adapter.summariesForDay(today.day);
  const verdict = assessDay(tests, today.doseClock);
  const flagged = tests.find((t) => t.id === verdict.wearingOffId);
  const yTests = yesterday ? adapter.summariesForDay(yesterday.day) : [];
  const yVerdict = yesterday ? assessDay(yTests, yesterday.doseClock) : null;
  const last = tests[tests.length - 1];

  return (
    <div className="space-y-8">
      <header className="volutra-rise space-y-3">
        <p className="text-sm text-muted-foreground">
          {today.label}. {DEMO_PERSON.label}
        </p>
        <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
          {tests.length} spirals since the {today.doseClock} dose
        </h1>
        <p className="max-w-[68ch] text-muted-foreground">
          Every spiral is a 20-second tremor reading. Volutra lines them up against the time of your levodopa dose so the
          afternoon dip stops being a feeling and becomes a time on a chart.
        </p>
      </header>

      <div className="volutra-rise-group grid items-start gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s spirals, as fired clay</CardTitle>
            <CardDescription>Pick a time to rebuild the coil from that drawing.</CardDescription>
          </CardHeader>
          <CardContent>
            <TodayCoil tests={tests} thresholdMm={verdict.thresholdMm} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>What today says</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-relaxed">
              {verdict.baselineMm !== null && verdict.thresholdMm !== null ? (
                <p>
                  Your first two readings after the dose set a baseline of{" "}
                  <strong className="font-semibold">{verdict.baselineMm.toFixed(2)} mm</strong>. Volutra draws its line at{" "}
                  {WEARING_OFF_RATIO} times that, {verdict.thresholdMm.toFixed(2)} mm.
                </p>
              ) : (
                <p>Two readings after the dose are needed before a baseline exists.</p>
              )}
              {flagged && verdict.minutesAfterDose !== null ? (
                <p>
                  At <strong className="font-semibold">{flagged.clock}</strong>, {formatSinceDose(verdict.minutesAfterDose)} after
                  the dose, the tremor reached {flagged.amplitudeMm.toFixed(2)} mm. That is where the dose started wearing off.
                  {last && last.id !== flagged.id && ` By ${last.clock} it was ${last.amplitudeMm.toFixed(2)} mm.`}
                </p>
              ) : (
                <p>No reading has crossed the line today.</p>
              )}
              {yVerdict && (
                <p className="text-muted-foreground">
                  Yesterday the line was crossed at {yVerdict.wearingOffClock ?? "no point"}
                  {yVerdict.minutesAfterDose !== null && `, ${formatSinceDose(yVerdict.minutesAfterDose)} after the dose`}. Two days
                  in a row is a pattern worth showing your neurologist.
                </p>
              )}
              <p className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
                <Link href="/activity" className="kiln-underline">
                  See the dose day chart
                </Link>
                <Link href="/spirals/uci-pwp-sst-07" className="kiln-underline">
                  Replay a tablet recording
                </Link>
              </p>
            </CardContent>
          </Card>

          <details className="group rounded-lg border border-border bg-card p-5 text-sm md:p-6">
            <summary className="cursor-pointer font-display text-lg font-semibold marker:text-primary">
              How a spiral becomes a number
            </summary>
            <div className="mt-3 max-w-[68ch] space-y-3 leading-relaxed text-muted-foreground">
              <p>
                The pad records each pointer event with its timestamp, including the coalesced events browsers batch between
                frames. Volutra unwraps the spiral into angle and radius, fits the ideal Archimedes line r = a + bθ, and keeps
                what is left over: how far the pen strayed from the line, moment by moment.
              </p>
              <p>
                That residual is resampled to 100 Hz, windowed and run through a Fourier transform. The tallest peak between 3
                and 12 Hz is the tremor frequency. Parkinsonian rest tremor usually sits around 4 to 6 Hz. The energy in that
                band gives the amplitude in millimetres.
              </p>
              <p>
                A small logistic regression then compares those features with the UCI Parkinson&apos;s spiral dataset. It is a
                second opinion on the shape of the signal, never a diagnosis.
              </p>
            </div>
          </details>

          <p className="text-xs leading-relaxed text-muted-foreground">
            {DEMO_PERSON.review}. Volutra is a measurement diary, not a diagnostic tool. Every reading stays in this browser.
          </p>
        </div>
      </div>
    </div>
  );
}
