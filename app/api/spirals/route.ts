import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapter";
import type { ApiResponse, TestSummary } from "@/lib/types";

export function GET() {
  const adapter = getAdapter();
  return NextResponse.json<ApiResponse<TestSummary[]>>(
    { data: adapter.listSummaries(), mode: adapter.mode, source: adapter.source },
    { status: 200 }
  );
}
