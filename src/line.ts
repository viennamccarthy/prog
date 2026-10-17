// No Node imports: the mod imports this, and mods run without Node.
import type { Plan } from './plans';

export interface RepoStatus {
  root: string;
  repo: string;
  /** Rules-block version in root CLAUDE.md; null when the repo doesn't use prog. */
  blockVersion: number | null;
  currentBlockVersion: number;
  branch: string;
  dirty: number;
  plans: Plan[];
  /** Files in `.plans/` not named `<issue>-<slug>.md`. */
  strays: string[];
}

/** The plan to feature: the one for the current branch, else the first active one. */
export function currentPlan(s: RepoStatus): Plan | undefined {
  return (
    s.plans.find((p) => p.branch === s.branch) ??
    s.plans.find((p) => p.status === 'active')
  );
}

/** One short line for the band: `◆ 12-search 3/9 (+1) · main +2`. */
export function formatLine(s: RepoStatus): string {
  const plan = currentPlan(s);
  const others = s.plans.length - (plan ? 1 : 0);
  const parts = [
    plan ? `◆ ${plan.name} ${plan.done}/${plan.total}` : '◆ no plan',
  ];
  if (others) parts[0] += ` (+${others})`;
  parts.push(s.dirty ? `${s.branch} +${s.dirty}` : s.branch);
  return parts.join(' · ');
}
