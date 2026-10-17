import { expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parsePlan } from './plans';
import { sessionStart } from './session-start';
import { formatLine, type RepoStatus } from './status';
import { tidyOverdue } from './tidy';

const base: RepoStatus = {
  root: '/r/demo',
  repo: 'demo',
  blockVersion: 2,
  currentBlockVersion: 2,
  branch: '12-search',
  dirty: 2,
  plans: [
    parsePlan('12-search', 'branch: x\n- [x] a\n- [ ] b\n')!,
    parsePlan('15-export', '---\nstatus: draft\n---\n- [ ] draft step\n')!,
  ],
  strays: ['notes.md'],
};
base.plans[0]!.branch = '12-search';

test('outside git the hook is silent', () => {
  expect(sessionStart(null)).toBeNull();
});

test('an unmarked repo gets a one-line offer and a hands-off instruction', () => {
  const r = sessionStart({ ...base, blockVersion: null })!;
  expect(r.systemMessage).toContain('/prog setup');
  expect(r.hookSpecificOutput.additionalContext).toContain("Don't set it up");
});

test('a marked repo lists plans, strays and the draft', () => {
  const msg = sessionStart(base)!.systemMessage;
  expect(msg).toContain('12-search [unknown] 1/2 → next: b');
  expect(msg).toContain('stray plan file notes.md');
  expect(msg).toContain('15-export is a draft awaiting approval');
  expect(msg).not.toContain('rules block');
});

test('an older block and an overdue tidy are flagged', () => {
  const msg = sessionStart({ ...base, blockVersion: 1 }, 45)!.systemMessage;
  expect(msg).toContain('rules block is v1; prog\'s is v2');
  expect(msg).toContain('45 days ago');
});

test('the band line features the plan for the current branch', () => {
  expect(formatLine(base)).toBe('◆ 12-search 1/2 (+1) · 12-search +2');
  expect(formatLine({ ...base, plans: [], dirty: 0, branch: 'main' })).toBe(
    '◆ no plan · main',
  );
});

test('tidy nags only after 30 days, starting from first sight', () => {
  const dir = mkdtempSync(join(tmpdir(), 'prog-'));
  const day = 86_400_000;
  try {
    expect(tidyOverdue(dir, '/r', 0)).toBeNull();
    expect(tidyOverdue(dir, '/r', 30 * day)).toBeNull();
    expect(tidyOverdue(dir, '/r', 31 * day)).toBe(31);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
