import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import type { ApiResponse, SpiralTest, TestSummary } from "@/lib/types";

type SpiralRecord = { test: SpiralTest; summary: TestSummary | null };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const adapter = getAdapter();
  const test = adapter.getTest(id);
  if (!test) {
    return NextResponse.json<ApiResponse<null>>({ data: null, mode: adapter.mode, source: "seed" }, { status: 404 });
  }
  return NextResponse.json<ApiResponse<SpiralRecord>>(
    { data: { test, summary: adapter.getSummary(id) ?? null }, mode: adapter.mode, source: "seed" },
    { status: 200 }
  );
}
