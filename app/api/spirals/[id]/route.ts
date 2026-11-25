import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import { HINTS, type ApiError } from "@/lib/errors";
import { SpiralIdSchema } from "@/lib/schemas";
import type { ApiResponse, SpiralTest, TestSummary } from "@/lib/types";

type SpiralRecord = { test: SpiralTest; summary: TestSummary | null };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const parsed = SpiralIdSchema.safeParse(rawId);
  if (!parsed.success) {
    return NextResponse.json<ApiError>({ error: "invalid_input", hint: HINTS.invalid_input }, { status: 400 });
  }
  const id = parsed.data;
  const adapter = getAdapter();
  const test = adapter.getTest(id);
  if (!test) {
    return NextResponse.json<ApiError>({ error: "not_found", hint: HINTS.not_found }, { status: 404 });
  }
  return NextResponse.json<ApiResponse<SpiralRecord>>(
    { data: { test, summary: adapter.getSummary(id) ?? null }, mode: adapter.mode, source: adapter.source },
    { status: 200 }
  );
}
