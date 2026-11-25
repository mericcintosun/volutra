import { analyzeTrace, type SpiralAnalysis, type TracePoint } from "./tremor";

// Analysis memo keyed by the content of the trace, not by record id. The fake and the
// real diary share ids, so an id key would hand one diary the other's numbers.

const hashMemo = new WeakMap<TracePoint[], string>();
const analysisMemo = new Map<string, SpiralAnalysis | null>();
const MAX_ENTRIES = 64;

function mix(h: number, v: number): number {
  let out = h;
  for (let k = 0; k < 4; k++) {
    out ^= (v >>> (k * 8)) & 0xff;
    out = Math.imul(out, 16777619);
  }
  return out;
}

/** FNV-1a over x and y rounded to 0.01 mm and t rounded to 1 ms. */
export function hashTrace(points: TracePoint[]): string {
  const known = hashMemo.get(points);
  if (known) return known;
  let h = 2166136261;
  h = mix(h, points.length);
  for (const p of points) {
    h = mix(h, Math.round(p.x * 100) | 0);
    h = mix(h, Math.round(p.y * 100) | 0);
    h = mix(h, Math.round(p.t * 1000) | 0);
  }
  const key = `${(h >>> 0).toString(16)}-${points.length}`;
  hashMemo.set(points, key);
  return key;
}

/** analyzeTrace, memoized by hashTrace. */
export function cachedAnalysis(points: TracePoint[]): SpiralAnalysis | null {
  const key = hashTrace(points);
  if (analysisMemo.has(key)) return analysisMemo.get(key) ?? null;
  const result = analyzeTrace(points);
  if (analysisMemo.size >= MAX_ENTRIES) {
    const oldest = analysisMemo.keys().next().value;
    if (oldest !== undefined) analysisMemo.delete(oldest);
  }
  analysisMemo.set(key, result);
  return result;
}
