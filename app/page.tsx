import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/route-states";
import { TodayCoil } from "@/components/today-coil";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Disclosure, DisclosureContent, DisclosureSummary } from "@/components/ui/disclosure";
import { getAdapter } from "@/lib/adapter";
import { DEMO_PERSON, WEARING_OFF_RATIO, assessDay, formatSinceDose } from "@/lib/data";

export const metadata: Metadata = { title: "Overview" };

const REPO_URL = "https://github.com/mericcintosun/volutra";
const HACKATHON_URL = "https://ml-build-challenge-4.devpost.com/";

/** Visible on every width: phones have no rail paragraph, so the repo link lives here too. */
function OverviewFooter({ className }: { className?: string }) {
  return (
    <footer className={className}>
      <p className="max-w-[65ch] border-t border-border pt-6 text-sm leading-relaxed text-muted-foreground">
        {DEMO_PERSON.review}. A measurement diary, not a diagnostic tool, and every reading stays in this browser.{" "}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="kiln-underline text-foreground">
          Source on GitHub
        </a>
        , built for the{" "}
        <a href={HACKATHON_URL} target="_blank" rel="noopener noreferrer" className="kiln-underline text-foreground">
          ML Empowerment Build Challenge 4.0</a>
        .
      </p>
    </footer>
  );
}

const RAIL_HINT = (
  <>
    Use &ldquo;Draw a spiral&rdquo; in the rail to take a 20-second reading; after a dose and a few readings, this page shows
    the hour the dose started wearing off.
  </>
);

export default function Overview() {
  const adapter = getAdapter();
  const [today, yesterday] = adapter.listDays();

  if (!today) {
    return (
      <div className="volutra-rise-group space-y-8">
        <header className="space-y-3">
          <h1 className="font-display text-3xl font-semibold leading-tight md:text-4xl">Welcome to your spiral diary</h1>
        </header>
        <EmptyState title="There are no diary days yet" body={RAIL_HINT} />
        <OverviewFooter />
      </div>
    );
  }

  const tests = adapter.summariesForDay(today.day);

  if (tests.length === 0) {
    return (
      <div className="volutra-rise-group space-y-8">
        <header className="space-y-3">
          <p className="text-sm text-muted-foreground">{today.label}</p>
          <h1 className="font-display text-3xl font-semibold leading-tight md:text-4xl">
            No spirals since the {today.doseClock} dose
          </h1>
        </header>
        <EmptyState title="Today has no readings yet" body={RAIL_HINT} />
        <OverviewFooter />
      </div>
    );
  }

  const verdict = assessDay(tests, today.doseClock, WEARING_OFF_RATIO, today.nextDoseClock || undefined);
  const flagged = tests.find((t) => t.id === verdict.wearingOffId);
  const yTests = yesterday ? adapter.summariesForDay(yesterday.day) : [];
  const yVerdict = yesterday ? assessDay(yTests, yesterday.doseClock, WEARING_OFF_RATIO, yesterday.nextDoseClock || undefined) : null;

  return (
    <div className="volutra-rise-group grid items-start gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,3fr)]">
      <header className="space-y-2 lg:col-span-2">
        <p className="text-sm text-muted-foreground">
          {today.label}. {DEMO_PERSON.label}
        </p>
        <h1 className="font-display text-3xl font-semibold leading-tight md:text-4xl">
          {tests.length} spirals since the {today.doseClock} dose
        </h1>
        <p className="max-w-[65ch] text-muted-foreground">
          Each spiral is a 20-second tremor reading, measured in this browser against the dose time.{" "}
          <Link href="/spirals/uci-pwp-sst-07" className="kiln-underline text-foreground">
            Replay a real patient&apos;s tablet spiral</Link>
          .
        </p>
      </header>

      <section id="today-coil" aria-labelledby="today-coil-title" className="scroll-mt-20 lg:row-span-2">
        <Card>
          <CardHeader className="pb-4 md:pb-4">
            <h2 id="today-coil-title" className="font-display text-xl font-semibold leading-tight">
              Today&apos;s spirals, as fired clay
            </h2>
          </CardHeader>
          <CardContent>
            <TodayCoil tests={tests} thresholdMm={verdict.thresholdMm} />
          </CardContent>
        </Card>
      </section>

      <section id="verdict" aria-labelledby="verdict-title" className="scroll-mt-20">
        <Card>
          <CardHeader>
            <h2 id="verdict-title" className="font-display text-xl font-semibold leading-tight">
              What today says
            </h2>
          </CardHeader>
          <CardContent className="max-w-[65ch] space-y-4 text-sm leading-relaxed">
            {verdict.baselineMm !== null && verdict.thresholdMm !== null && flagged && verdict.minutesAfterDose !== null ? (
              <p>
                At <strong className="font-semibold">{flagged.clock}</strong>, {formatSinceDose(verdict.minutesAfterDose)} after the
                dose, the tremor reached <strong className="font-semibold">{flagged.amplitudeMm.toFixed(2)} mm</strong>, past the{" "}
                {verdict.thresholdMm.toFixed(2)} mm line ({WEARING_OFF_RATIO} times the {verdict.baselineMm.toFixed(2)} mm baseline
                set by the first two readings), so that is where the dose started wearing off.
              </p>
            ) : verdict.baselineMm !== null && verdict.thresholdMm !== null ? (
              <p>
                No reading has crossed today&apos;s {verdict.thresholdMm.toFixed(2)} mm line ({WEARING_OFF_RATIO} times the{" "}
                {verdict.baselineMm.toFixed(2)} mm baseline).
              </p>
            ) : (
              <p>Two readings after the dose are needed before a baseline exists.</p>
            )}
            {yVerdict && (
              <p className="text-muted-foreground">
                Yesterday the line was crossed at {yVerdict.wearingOffClock ?? "no point"}
                {yVerdict.minutesAfterDose !== null && `, ${formatSinceDose(yVerdict.minutesAfterDose)} after the dose`}.
              </p>
            )}
            <p>
              <Link href="/activity" className="kiln-underline">
                See the dose day chart
              </Link>
            </p>
          </CardContent>
        </Card>
      </section>

      <section id="method" aria-label="How it is measured" className="scroll-mt-20">
        <Disclosure className="text-sm">
          <DisclosureSummary>
            <h2 className="inline font-display text-xl font-semibold leading-tight">How a spiral becomes a number</h2>
          </DisclosureSummary>
          <DisclosureContent className="max-w-[65ch] space-y-3 leading-relaxed text-muted-foreground">
            <p>The same four steps run on every spiral, in this tab:</p>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li>Unwrap the drawing into angle and radius around its centre.</li>
              <li>Fit the ideal Archimedes line r = a + bθ and keep how far the pen strayed from it.</li>
              <li>Resample that residual to 100 Hz and run an FFT; the tallest peak from 3 to 12 Hz is the tremor.</li>
              <li>Compare the features with a logistic regression trained on UCI 395 spirals, a second opinion, never a diagnosis.</li>
            </ol>
          </DisclosureContent>
        </Disclosure>
      </section>

      <OverviewFooter className="lg:col-span-2" />
    </div>
  );
}
