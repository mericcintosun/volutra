"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/route-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STATUS_LABEL, formatSinceDose, type TestSummary } from "@/lib/data";

const STATUS_VARIANT = { baseline: "olive", within: "secondary", past: "bad", replay: "outline" } as const;

/**
 * Every spiral record with a scope filter, a threshold toggle and free-text search.
 * The URL is the one source of truth: ?day= (a diary day or "uci"), ?past=1 and ?q=.
 * Must render under <Suspense> because it reads useSearchParams.
 */
export function SpiralIndex({ rows }: { rows: TestSummary[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const scope = params.get("day") ?? "all";
  const pastOnly = params.get("past") === "1";
  const query = params.get("q") ?? "";
  const inputRef = useRef<HTMLInputElement>(null);

  const scopes = useMemo(() => {
    const days = Array.from(new Map(rows.filter((r) => r.source === "home").map((r): [string, string] => [r.day, r.dayLabel])).entries());
    return [
      { key: "all", label: "All" },
      ...days.map(([key, label]) => ({ key, label })),
      { key: "uci", label: "UCI replays" },
    ];
  }, [rows]);

  // the search box is uncontrolled so typing never waits on the router; when the URL
  // changes from outside (Clear filters, back button) and the box is not focused, follow it
  useEffect(() => {
    const el = inputRef.current;
    if (el && el.value !== query && document.activeElement !== el) el.value = query;
  }, [query]);

  const setParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const s = next.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  };

  const visible = rows.filter((r) => {
    if (scope === "uci" && r.source !== "uci") return false;
    if (scope !== "all" && scope !== "uci" && r.day !== scope) return false;
    if (pastOnly && r.status !== "past") return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [r.clock, r.dayLabel, r.device, r.note, STATUS_LABEL[r.status], r.uciGroup ?? ""].join(" ").toLowerCase().includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="group" aria-label="Filter by day" className="flex flex-wrap gap-2">
          {scopes.map((s) => (
            <Button
              key={s.key}
              variant="segment"
              size="sm"
              aria-pressed={scope === s.key}
              onClick={() => setParams({ day: s.key === "all" ? null : s.key })}
            >
              {s.label}
            </Button>
          ))}
          <Button variant="segment" size="sm" aria-pressed={pastOnly} onClick={() => setParams({ past: pastOnly ? null : "1" })}>
            Past threshold only
          </Button>
        </div>
        <label className="relative block w-full lg:w-72">
          <span className="sr-only">Search spirals</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            ref={inputRef}
            defaultValue={query}
            onChange={(e) => setParams({ q: e.target.value.trim() ? e.target.value : null })}
            placeholder="Search notes, device, time"
            className="pl-9"
          />
        </label>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {visible.length} of {rows.length} spirals
      </p>

      {visible.length === 0 ? (
        <EmptyState
          title="No spirals match this filter"
          body={`Nothing fits "${query || "these filters"}".`}
          href="/spirals"
          cta="Clear filters"
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {visible.map((r) => (
            <li key={r.id}>
              <Link
                href={`/spirals/${r.id}`}
                className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted md:grid-cols-[5rem_minmax(0,1fr)_7rem_7rem_8.5rem] md:px-5"
              >
                <span>
                  <span className="block font-display text-lg font-semibold leading-none">{r.clock}</span>
                  <span className="text-xs text-muted-foreground">{r.source === "uci" ? r.uciGroup : r.dayLabel}</span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm">{r.note}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.device}
                    {r.minutesSinceDose !== null && `, ${formatSinceDose(r.minutesSinceDose)} after the dose`}
                  </span>
                </span>
                <span className="hidden text-sm md:block">{r.peakHz.toFixed(1)} Hz</span>
                <span className="hidden text-sm md:block">{r.amplitudeMm.toFixed(2)} mm</span>
                <span className="justify-self-end">
                  <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
