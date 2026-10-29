import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, Night, ReadNight, RunLine, RunStatus } from './types.js';

const NIGHT = /^\d{4}-\d{2}-\d{2}$/;

function isStatus(value: unknown): value is RunStatus {
  return value === 'ok' || value === 'retry' || value === 'fail';
}

// Parse at the edge: one raw line in, a RunLine or null out. Never throws.
export function parseLine(raw: string): RunLine | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const rec = value as Record<string, unknown>;
  const { at, job, status, owner, error } = rec;
  if (typeof at !== 'string' || at === '') return null;
  if (typeof job !== 'string' || job === '') return null;
  if (!isStatus(status)) return null;
  if (owner !== null && typeof owner !== 'string') return null;
  if (error !== undefined && typeof error !== 'string') return null;
  const line: RunLine = { at, job, status, owner };
  if (error !== undefined) line.error = error;
  return line;
}

export function toRows(lines: RunLine[]): DigestRow[] {
  const byJob = new Map<string, DigestRow>();
  for (const line of lines) {
    const row = byJob.get(line.job);
    if (row === undefined) {
      byJob.set(line.job, {
        job: line.job,
        owner: line.owner,
        runs: 1,
        retries: line.status === 'retry' ? 1 : 0,
        fails: line.status === 'fail' ? 1 : 0,
        lastStatus: line.status,
        lastError: line.error ?? null,
        firstAt: line.at,
        lastAt: line.at,
      });
      continue;
    }
    row.runs += 1;
    if (line.status === 'retry') row.retries += 1;
    if (line.status === 'fail') row.fails += 1;
    row.lastStatus = line.status;
    row.lastError = line.error ?? null;
    row.lastAt = line.at;
    row.owner = line.owner;
  }
  return [...byJob.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0));
}

export const readNight: ReadNight = (runsDir, night) => {
  if (!NIGHT.test(night)) return null;
  const file = join(runsDir, `${night}.jsonl`);
  if (!existsSync(file)) return null;
  const text = readFileSync(file, 'utf8');
  const lines: RunLine[] = [];
  let badLines = 0;
  for (const raw of text.split('\n')) {
    const trimmed = raw.replace(/\r$/, '');
    if (trimmed.trim() === '') continue;
    const line = parseLine(trimmed);
    if (line === null) badLines += 1;
    else lines.push(line);
  }
  const result: Night = { night, rows: toRows(lines), badLines };
  return result;
};
