export interface Plan {
  /** File name without `.md`, e.g. `12-search`. */
  name: string;
  issue: number;
  branch?: string;
  status: string;
  done: number;
  total: number;
  /** First unchecked step, shortened; undefined when every step is ticked. */
  next?: string;
}

export const PLAN_NAME = /^(\d+)-[a-z0-9-]+$/;
const NEXT_MAX = 80;

/** Reads a plan's frontmatter and checkbox steps. Returns null if the name isn't `<issue>-<slug>`. */
export function parsePlan(name: string, text: string): Plan | null {
  const m = PLAN_NAME.exec(name);
  if (!m) return null;

  const front: Record<string, string> = {};
  const fm = /^---\n([\s\S]*?)\n---/.exec(text);
  for (const line of fm?.[1]?.split('\n') ?? []) {
    const kv = /^(\w+):\s*(.*)$/.exec(line);
    if (kv) front[kv[1]!] = kv[2]!.trim();
  }

  let done = 0;
  let total = 0;
  let next: string | undefined;
  for (const s of text.matchAll(/^\s*- \[([ xX])\] (.*)$/gm)) {
    const body = s[2]!.trim();
    // A struck-through step was replaced by the step after it.
    if (body.startsWith('~~')) continue;
    total++;
    if (s[1] !== ' ') done++;
    else next ??= shorten(body.replace(/\*\*/g, ''));
  }

  return {
    name,
    issue: Number(m[1]),
    branch: front.branch || undefined,
    status: front.status || 'unknown',
    done,
    total,
    next,
  };
}

function shorten(s: string): string {
  return s.length <= NEXT_MAX ? s : `${s.slice(0, NEXT_MAX - 1).trimEnd()}…`;
}
