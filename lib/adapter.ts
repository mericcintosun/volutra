import { fakeAdapter } from "./adapter-fake";
import { getRealAdapter } from "./adapter-real";
import { ADAPTER_MODE, CORE_LOG } from "./config";
import type { DiaryAdapter } from "./types";

// The selector. Pages and API routes call getAdapter() and never import an adapter file
// directly. Server-side use only: ADAPTER_MODE has no NEXT_PUBLIC_ prefix.
// Fallback: if the real adapter throws while it builds, the seed diary is served instead,
// so DEMO steps 1, 3, 4 and 5 still render (with the stand-in source line).

export type { AdapterMode, DiaryAdapter, DiarySource } from "./types";

export function getAdapter(): DiaryAdapter {
  if (ADAPTER_MODE !== "real") return fakeAdapter;
  try {
    return getRealAdapter();
  } catch {
    console.warn(`${CORE_LOG} real adapter failed, serving seed`);
    return fakeAdapter;
  }
}
