// Plan morning-digest § 1. The contract every part of § 2 builds against.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, after parsing.
export type RunLine = {
  at: string; // ISO 8601 with the log's offset, kept as written
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job in a night.
export type DigestRow = {
  job: string;
  owner: string | null; // null renders as '—'
  runs: number; // lines for this job
  retries: number; // lines with status 'retry'
  fails: number; // lines with status 'fail'
  lastStatus: RunStatus;
  lastError: string | null;
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that didn't parse; counted, never thrown
};

// No file for the night → null (the page answers 404). An empty file → a Night with no rows.
export type ReadNight = (runsDir: string, night: string) => Night | null;
