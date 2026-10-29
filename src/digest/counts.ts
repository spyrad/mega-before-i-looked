import type { Night } from './types.js';

export type NightCounts = { ok: number; retry: number; fail: number; bad: number };

// Per-night totals, summed over the digest rows.
export function countNight(night: Night): NightCounts {
  let ok = 0;
  let retry = 0;
  let fail = 0;
  for (const r of night.rows) {
    retry += r.retries;
    fail += r.fails;
    ok += r.runs - r.retries - r.fails;
  }
  return { ok, retry, fail, bad: night.badLines };
}
