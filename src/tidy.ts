import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const TIDY_NAG_DAYS = 30;
const DAY = 86_400_000;

type Stamps = Record<string, number>;

function file(dataDir: string): string {
  return join(dataDir, 'tidy.json');
}

function read(dataDir: string): Stamps {
  try {
    return JSON.parse(readFileSync(file(dataDir), 'utf8'));
  } catch {
    return {};
  }
}

function write(dataDir: string, stamps: Stamps): void {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  writeFileSync(file(dataDir), `${JSON.stringify(stamps, null, 2)}\n`);
}

/** Records a tidy of `root` at `now`. */
export function markTidy(dataDir: string, root: string, now: number): void {
  write(dataDir, { ...read(dataDir), [root]: now });
}

/**
 * Days since `root` was last tidied, if that's over the nag threshold.
 * A repo seen for the first time is stamped now, so the nag starts a month later.
 */
export function tidyOverdue(
  dataDir: string,
  root: string,
  now: number,
): number | null {
  const stamps = read(dataDir);
  const last = stamps[root];
  if (last === undefined) {
    markTidy(dataDir, root, now);
    return null;
  }
  const days = Math.floor((now - last) / DAY);
  return days > TIDY_NAG_DAYS ? days : null;
}
