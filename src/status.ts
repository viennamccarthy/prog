import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { BLOCK_VERSION, blockVersion } from './marker';
import { type Plan, parsePlan } from './plans';

import type { RepoStatus } from './line';

export { currentPlan, formatLine, type RepoStatus } from './line';

function git(cwd: string, ...args: string[]): string | null {
  const r = Bun.spawnSync(['git', ...args], { cwd, stderr: 'ignore' });
  return r.exitCode === 0 ? r.stdout.toString().trimEnd() : null;
}

/** Git root of `cwd`, or null outside a git repo. */
export function gitRoot(cwd: string): string | null {
  return git(cwd, 'rev-parse', '--show-toplevel');
}

/** Everything prog shows about a repo; null outside git. */
export function repoStatus(cwd: string): RepoStatus | null {
  const root = gitRoot(cwd);
  if (!root) return null;

  const claudeMd = join(root, 'CLAUDE.md');
  const version = blockVersion(
    existsSync(claudeMd) ? readFileSync(claudeMd, 'utf8') : null,
  );

  const plans: Plan[] = [];
  const strays: string[] = [];
  const dir = join(root, '.plans');
  if (version !== null && existsSync(dir)) {
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
      const plan = parsePlan(
        basename(f, '.md'),
        readFileSync(join(dir, f), 'utf8'),
      );
      if (plan) plans.push(plan);
      else strays.push(f);
    }
  }

  const porcelain = git(root, 'status', '--porcelain') ?? '';
  return {
    root,
    repo: basename(root),
    blockVersion: version,
    currentBlockVersion: BLOCK_VERSION,
    branch: git(root, 'branch', '--show-current') || '(detached)',
    dirty: porcelain ? porcelain.split('\n').length : 0,
    plans,
    strays,
  };
}

const NEXT_MAX = 80;

function shorten(s: string): string {
  return s.length <= NEXT_MAX ? s : `${s.slice(0, NEXT_MAX - 1).trimEnd()}…`;
}

/** Multi-line summary: branch state, then each plan with its next step (shortened unless `full`). */
export function formatSummary(s: RepoStatus, full = false): string {
  const state = `branch ${s.branch}${s.dirty ? `, ${s.dirty} uncommitted` : ''}`;
  const lines = s.plans.map((p) => {
    const next = p.next
      ? `next: ${full ? p.next : shorten(p.next)}`
      : 'all steps ticked; close it with /prog done';
    return `  • ${p.name} [${p.status}] ${p.done}/${p.total} → ${next}`;
  });
  for (const f of s.strays)
    lines.push(`  • stray plan file ${f} (not <issue>-<slug>.md): adopt or delete it`);
  return lines.length
    ? `Plans (${state}):\n${lines.join('\n')}`
    : `No active plans · ${state}`;
}
