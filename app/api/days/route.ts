import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import type { ApiResponse, DoseDay, TestSummary } from "@/lib/types";

type DayWithTests = DoseDay & { tests: TestSummary[] };

export function GET() {
  const adapter = getAdapter();
  const data: DayWithTests[] = adapter.listDays().map((d) => ({ ...d, tests: adapter.summariesForDay(d.day) }));
  return NextResponse.json<ApiResponse<DayWithTests[]>>({ data, mode: adapter.mode, source: adapter.source }, { status: 200 });
}
