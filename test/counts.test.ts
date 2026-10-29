import { describe, expect, it } from 'vitest';
import { countNight } from '../src/digest/counts.js';
import type { DigestRow } from '../src/digest/types.js';

const row = (runs: number, retries: number, fails: number): DigestRow => ({
  job: 'j', owner: null, runs, retries, fails, lastStatus: 'ok', lastError: null, firstAt: 'a', lastAt: 'b',
});

describe('countNight', () => {
  it('sums ok / retry / fail over rows', () => {
    expect(countNight({ night: '2026-10-28', rows: [row(10, 2, 1), row(5, 1, 0)], badLines: 3 })).toEqual({
      ok: 11, retry: 3, fail: 1, bad: 3,
    });
  });
  it('empty night is all zero', () => {
    expect(countNight({ night: 'x', rows: [], badLines: 0 })).toEqual({ ok: 0, retry: 0, fail: 0, bad: 0 });
  });
});
