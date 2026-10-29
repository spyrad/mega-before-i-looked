import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

const JOBS = ['rig/rotate-logs', 'lane/sync', 'fixtures/refresh', 'notes/backup', 'digest/render'];

let runsDir = '';
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  runsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rig-digest-'));
  fs.copyFileSync(path.join('runs', '2026-10-28.jsonl'), path.join(runsDir, '2026-10-28.jsonl'));
  fs.writeFileSync(path.join(runsDir, '2026-10-30.jsonl'), '');
  fs.writeFileSync(
    path.join(runsDir, '2026-10-31.jsonl'),
    '{"at":"2026-10-31T01:00:00+01:00","job":"lane/sync","status":"ok","owner":"rook"}\nnot json\n',
  );
  app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir });
});

afterAll(() => {
  fs.rmSync(runsDir, { recursive: true, force: true });
});

describe('digest page', () => {
  it('lists every job, shows — for a null owner and counts the bad line', async () => {
    const res = await app.request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    for (const job of JOBS) expect(html).toContain(job);
    expect(html).toContain('—');
    expect(html).toMatch(/didn(&#39;|')t parse/);
  });

  it('404s for a night without a file', async () => {
    expect((await app.request('/digest/2026-10-29')).status).toBe(404);
  });

  it('says nothing ran for an empty night', async () => {
    const res = await app.request('/digest/2026-10-30');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('mentions the bad line in a night with one', async () => {
    const res = await app.request('/digest/2026-10-31');
    expect(res.status).toBe(200);
    expect(await res.text()).toMatch(/didn(&#39;|')t parse/);
  });
});

describe('digest JSON', () => {
  it('404s for a night without a file', async () => {
    expect((await app.request('/api/digest/2026-10-29')).status).toBe(404);
  });

  it('returns no rows for an empty night', async () => {
    const res = await app.request('/api/digest/2026-10-30');
    const body = (await res.json()) as Night;
    expect(res.status).toBe(200);
    expect(body.rows).toEqual([]);
    expect(body.badLines).toBe(0);
  });

  it('counts the bad line in a night with one', async () => {
    const res = await app.request('/api/digest/2026-10-31');
    const body = (await res.json()) as Night;
    expect(res.status).toBe(200);
    expect(body.badLines).toBe(1);
    expect(body.rows).toHaveLength(1);
  });

  it('returns night, rows and badLines for the good night', async () => {
    const res = await app.request('/api/digest/2026-10-28');
    const body = (await res.json()) as Night;
    expect(res.status).toBe(200);
    expect(body.night).toBe('2026-10-28');
    expect(body.rows).toHaveLength(5);
    expect(body.badLines).toBe(1);
  });

  it('lists jobs in the same order as the page', async () => {
    const html = await (await app.request('/digest/2026-10-28')).text();
    const body = (await (await app.request('/api/digest/2026-10-28')).json()) as Night;
    const jsonOrder = body.rows.map((r) => r.job);
    const pageOrder = [...jsonOrder].sort((a, b) => html.indexOf(a) - html.indexOf(b));
    expect(jsonOrder.every((j) => html.includes(j))).toBe(true);
    expect(pageOrder).toEqual(jsonOrder);
  });
});
