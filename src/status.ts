import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { countNight, type NightCounts } from './digest/counts.js';
import { readNight } from './digest/read.js';
import { lastBeat, type Beat } from './heartbeat.js';

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: NightEntry[];
};

export type NightEntry = { night: string; counts: NightCounts | null };

// Counts are a bonus on the board: a missing or unreadable night shows without them.
function entry(runsDir: string, night: string): NightEntry {
  try {
    const n = readNight(runsDir, night);
    return { night, counts: n ? countNight(n) : null };
  } catch {
    return { night, counts: null };
  }
}

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export function readStatus(config: RigConfig): Status {
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights: nightsOnDisk(config.runsDir).map((n) => entry(config.runsDir, n)),
  };
}
