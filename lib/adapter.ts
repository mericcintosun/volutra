import { fakeAdapter } from "./adapter-fake";
import { getRealAdapter } from "./adapter-real";
import { ADAPTER_MODE } from "./config";
import type { DiaryAdapter } from "./types";

// The selector. Pages and API routes call getAdapter() and never import an adapter file
// directly. Server-side use only: ADAPTER_MODE has no NEXT_PUBLIC_ prefix.

export type { AdapterMode, DiaryAdapter, DiarySource } from "./types";

export function getAdapter(): DiaryAdapter {
  return ADAPTER_MODE === "real" ? getRealAdapter() : fakeAdapter;
}
