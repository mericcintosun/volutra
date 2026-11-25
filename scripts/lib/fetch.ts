import { CORE_LOG, FETCH_RETRIES, FETCH_TIMEOUT_MS } from "../../lib/config";
import type { ErrorCode } from "../../lib/errors";

export type FetchResult = { ok: true; bytes: Uint8Array } | { ok: false; error: ErrorCode };

/** One attempt plus exactly FETCH_RETRIES retries, each bounded by FETCH_TIMEOUT_MS. */
export async function fetchWithRetry(url: string): Promise<FetchResult> {
  let last: ErrorCode = "upstream_error";
  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt++) {
    const started = Date.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      if (!res.ok) {
        last = "upstream_error";
        console.log(`${CORE_LOG} fetch failed: status ${res.status} after ${Date.now() - started} ms`);
        continue;
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      console.log(`${CORE_LOG} fetch ${bytes.byteLength} bytes in ${Date.now() - started} ms`);
      return { ok: true, bytes };
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      last = name === "TimeoutError" || name === "AbortError" ? "upstream_timeout" : "upstream_error";
      console.log(`${CORE_LOG} fetch failed: ${last} after ${Date.now() - started} ms`);
    }
  }
  return { ok: false, error: last };
}
