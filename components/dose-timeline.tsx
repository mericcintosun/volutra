"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  STATUS_LABEL,
  WEARING_OFF_RATIO,
  assessDay,
  clockToMinutes,
  formatSinceDose,
  minutesToClock,
  statusFor,
  type DayVerdict,
  type SpiralStatus,
} from "@/lib/data";
import { readDoseClocks, readLocalTests, writeDoseClock } from "@/lib/local-diary";

export interface TimelineDay {
  day: string;
  label: string;
  doseClock: string;
  nextDoseClock: string;
  medication: string;
  diary: string;
  tests: { id: string; clock: string; amplitudeMm: number; peakHz: number; device: string; href: string | null }[];
}

const STATUS_VARIANT = { baseline: "olive", within: "secondary", past: "bad", replay: "outline" } as const;

const W = 680;
const H = 260;
const PAD = { l: 44, r: 16, t: 18, b: 32 };
const START = 6 * 60;
const END = 20 * 60;

function TimelineChart({ points, doseClock, verdict }: { points: TimelineDay["tests"]; doseClock: string; verdict: DayVerdict }) {
  const maxMm = Math.max(1.2, ...points.map((p) => p.amplitudeMm)) * 1.12;
  const x = (mins: number) => PAD.l + ((Math.min(Math.max(mins, START), END) - START) / (END - START)) * (W - PAD.l - PAD.r);
  const y = (mm: number) => H - PAD.b - (mm / maxMm) * (H - PAD.t - PAD.b);
  const sorted = [...points].sort((a, b) => clockToMinutes(a.clock) - clockToMinutes(b.clock));
  const line = sorted.map((p, i) => `${i ? "L" : "M"}${x(clockToMinutes(p.clock)).toFixed(1)} ${y(p.amplitudeMm).toFixed(1)}`).join(" ");
  const dose = clockToMinutes(doseClock);
  const hours = [6, 8, 10, 12, 14, 16, 18, 20];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tremor amplitude across the day, against the time of the dose" className="w-full">
      {verdict.wearingOffClock && (
        <rect
          x={x(clockToMinutes(verdict.wearingOffClock) - 15)}
          y={PAD.t}
          width={x(END) - x(clockToMinutes(verdict.wearingOffClock) - 15)}
          height={H - PAD.t - PAD.b}
          className="fill-bad/15"
        />
      )}
      {hours.map((h) => (
        <g key={h}>
          <line x1={x(h * 60)} x2={x(h * 60)} y1={PAD.t} y2={H - PAD.b} className="stroke-border" strokeDasharray="2 6" />
          <text x={x(h * 60)} y={H - 10} textAnchor="middle" fontSize={11} className="fill-muted-foreground">
            {String(h).padStart(2, "0")}:00
          </text>
        </g>
      ))}
      <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} className="stroke-border" />
      <text x={6} y={PAD.t + 4} fontSize={11} className="fill-muted-foreground">
        {maxMm.toFixed(1)} mm
      </text>
      {verdict.baselineMm !== null && (
        <line x1={PAD.l} x2={W - PAD.r} y1={y(verdict.baselineMm)} y2={y(verdict.baselineMm)} strokeWidth={1.5} className="stroke-second" />
      )}
      {verdict.thresholdMm !== null && (
        <>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(verdict.thresholdMm)} y2={y(verdict.thresholdMm)} strokeWidth={1.5} strokeDasharray="6 5" className="stroke-warn" />
          <text x={W - PAD.r - 4} y={y(verdict.thresholdMm) - 6} textAnchor="end" fontSize={11} className="fill-warn">
            {WEARING_OFF_RATIO}x baseline
          </text>
        </>
      )}
      <line x1={x(dose)} x2={x(dose)} y1={PAD.t} y2={H - PAD.b} strokeWidth={2} className="stroke-foreground" />
      <text x={x(dose) + 6} y={PAD.t + 12} fontSize={11} className="fill-foreground">
        Dose {doseClock}
      </text>
      {verdict.wearingOffClock && (
        <text x={x(clockToMinutes(verdict.wearingOffClock) - 15) + 6} y={PAD.t + 28} fontSize={11} className="fill-bad">
          Wearing off from {verdict.wearingOffClock}
        </text>
      )}
      <path d={line} fill="none" strokeWidth={2.5} strokeLinejoin="round" className="stroke-primary" />
      {sorted.map((p) => (
        <circle key={p.id} cx={x(clockToMinutes(p.clock))} cy={y(p.amplitudeMm)} r={5} strokeWidth={2} className="fill-background stroke-primary" />
      ))}
    </svg>
  );
}

/** The dose day: timeline, wearing-off band, history, printout and CSV. */
export function DoseTimeline({ days }: { days: TimelineDay[] }) {
  const [deviceDays, setDeviceDays] = useState<TimelineDay[]>([]);
  const [doseOverrides, setDoseOverrides] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState(days[0]?.day ?? "");

  useEffect(() => {
    setDoseOverrides(readDoseClocks());
    const local = readLocalTests();
    const byDay = new Map<string, TimelineDay>();
    for (const t of local) {
      const d: TimelineDay = byDay.get(t.day) ?? {
        day: t.day,
        label: `Your device, ${t.day}`,
        doseClock: "08:00",
        nextDoseClock: "",
        medication: "Your dose",
        diary: "Saved from the drawing pad on this device.",
        tests: [],
      };
      d.tests.push({ id: t.id, clock: t.clock, amplitudeMm: t.amplitudeMm, peakHz: t.peakHz, device: "This device", href: null });
      byDay.set(t.day, d);
    }
    setDeviceDays(Array.from(byDay.values()));
  }, []);

  const allDays = useMemo(() => [...deviceDays, ...days], [deviceDays, days]);
  const day = allDays.find((d) => d.day === selected) ?? allDays[0];
  const doseClock = day ? doseOverrides[day.day] ?? day.doseClock : "08:00";
  const verdict = useMemo(() => (day ? assessDay(day.tests, doseClock) : null), [day, doseClock]);

  if (!day || !verdict) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">No diary days yet. Draw a spiral to start one.</CardContent>
      </Card>
    );
  }

  const rows = [...day.tests]
    .sort((a, b) => clockToMinutes(a.clock) - clockToMinutes(b.clock))
    .map((t) => ({ ...t, since: clockToMinutes(t.clock) - clockToMinutes(doseClock), status: statusFor(t, verdict) as SpiralStatus }));

  const events = [
    { clock: doseClock, text: `Dose taken: ${day.medication}` },
    ...rows.map((r) => ({
      clock: r.clock,
      text: `Spiral drawn on ${r.device.toLowerCase()}: ${r.peakHz.toFixed(1)} Hz, ${r.amplitudeMm.toFixed(2)} mm${r.status === "baseline" ? ", counted toward baseline" : ""}`,
    })),
    ...(verdict.wearingOffClock ? [{ clock: verdict.wearingOffClock, text: `Threshold crossed: wearing-off marked ${formatSinceDose(verdict.minutesAfterDose ?? 0)} after the dose` }] : []),
    ...(day.nextDoseClock ? [{ clock: day.nextDoseClock, text: "Next dose scheduled" }] : []),
  ].sort((a, b) => clockToMinutes(a.clock) - clockToMinutes(b.clock));

  const changeDose = (value: string) => {
    if (!/^\d{2}:\d{2}$/.test(value)) return;
    writeDoseClock(day.day, value);
    setDoseOverrides((o) => ({ ...o, [day.day]: value }));
  };

  const downloadCsv = () => {
    const header = "day,clock,minutes_since_dose,peak_hz,amplitude_mm,device,status";
    const lines = rows.map((r) => [day.day, r.clock, r.since, r.peakHz, r.amplitudeMm, `"${r.device}"`, STATUS_LABEL[r.status]].join(","));
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `volutra-${day.day}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 print:hidden md:flex-row md:items-end md:justify-between">
        <div role="group" aria-label="Pick a diary day" className="flex flex-wrap gap-2">
          {allDays.map((d) => (
            <Button key={d.day} variant="segment" size="sm" aria-pressed={d.day === day.day} onClick={() => setSelected(d.day)}>
              {d.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1 text-xs text-muted-foreground">
            <span className="block">Dose taken at</span>
            <Input type="time" value={doseClock} onChange={(e) => changeDose(e.target.value)} className="w-32" />
          </label>
          <Button variant="outline" onClick={downloadCsv}>
            <Download aria-hidden />
            CSV
          </Button>
          <Button onClick={() => window.print()}>
            <Printer aria-hidden />
            Print for the neurologist
          </Button>
        </div>
      </div>

      <div className="hidden print:block">
        <p className="font-display text-2xl font-semibold">Volutra measurement log, {day.label}</p>
        <p className="text-sm">
          {day.medication} at {doseClock}. Measurement diary for discussion with a clinician. Not a diagnostic tool.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {verdict.wearingOffClock
              ? `Wearing off from ${verdict.wearingOffClock}, ${formatSinceDose(verdict.minutesAfterDose ?? 0)} after the dose`
              : "No wearing-off marked on this day"}
          </CardTitle>
          <CardDescription>
            {verdict.baselineMm !== null && verdict.thresholdMm !== null
              ? `Baseline ${verdict.baselineMm.toFixed(2)} mm from the first two readings after the dose. Threshold ${verdict.thresholdMm.toFixed(2)} mm.`
              : "At least two readings 30 minutes or more after the dose are needed to set a baseline."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {day.tests.length === 0 ? (
            <p className="rounded-md border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              No readings yet for this day. Draw one from the rail.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <TimelineChart points={day.tests} doseClock={doseClock} verdict={verdict} />
            </div>
          )}
          <p className="text-sm italic text-muted-foreground">&ldquo;{day.diary}&rdquo;</p>
        </CardContent>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Readings</CardTitle>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No readings yet for this day. Draw one from the rail.</p>
            ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 font-normal">Time</th>
                  <th className="py-2 font-normal">After dose</th>
                  <th className="py-2 font-normal">Hz</th>
                  <th className="py-2 font-normal">mm</th>
                  <th className="py-2 text-right font-normal">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="py-2.5">
                      {r.href ? (
                        <Link href={r.href} className="kiln-underline">
                          {r.clock}
                        </Link>
                      ) : (
                        r.clock
                      )}
                    </td>
                    <td className="py-2.5 text-muted-foreground">{formatSinceDose(r.since)}</td>
                    <td className="py-2.5">{r.peakHz.toFixed(1)}</td>
                    <td className="py-2.5">{r.amplitudeMm.toFixed(2)}</td>
                    <td className="py-2.5 text-right">
                      <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What happened</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 border-l-2 border-border pl-4 text-sm">
              {events.map((e, i) => (
                <li key={`${e.clock}-${i}`} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3">
                  <span className="font-semibold">{e.clock}</span>
                  <span className="text-muted-foreground">{e.text}</span>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs text-muted-foreground">
              Day spans {minutesToClock(clockToMinutes(rows[0]?.clock ?? doseClock))} to{" "}
              {minutesToClock(clockToMinutes(rows[rows.length - 1]?.clock ?? doseClock))}.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
