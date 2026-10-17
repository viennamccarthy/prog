/**
 * Mechanical drift check for the repo system's docs layout: links, wikis, ADRs,
 * plan names, and open-question markers. Returns one line per problem.
 */
import { existsSync } from 'node:fs';
import { basename, dirname, join, normalize } from 'node:path';

const MAX_WIKI_LINES = 150;
const SOURCE_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|css)$/;
// Vendored or generated material is never edited by hand, so it isn't policed.
const SKIP = [/(^|\/)docs\/reference\//, /(^|\/)node_modules\//, /\.gen\.ts$/];

/** Blank out fenced and inline code (keeping offsets) so examples aren't read as links. */
function blankCode(text: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, ' ');
  return text.replace(/```[\s\S]*?```/g, blank).replace(/`[^`\n]+`/g, blank);
}

function lineOf(text: string, index: number): number {
  return text.slice(0, index).split('\n').length;
}

/** Runs every check over the tracked and untracked (non-ignored) files under `root`. */
export async function checkDocs(root: string): Promise<string[]> {
  const files = (
    await Bun.$`git -C ${root} ls-files -co --exclude-standard`.text()
  )
    .split('\n')
    .filter(
      (f) => f && !SKIP.some((re) => re.test(f)) && existsSync(join(root, f)),
    );

  const problems: string[] = [];
  const report = (file: string, line: number, msg: string) =>
    problems.push(`${file}${line ? `:${line}` : ''} — ${msg}`);
  const read = (f: string) => Bun.file(join(root, f)).text();

  /** Nearest ancestor directory (inclusive of repo root) holding a package.json. */
  function packageRootOf(file: string): string {
    let dir = dirname(file);
    while (dir !== '.' && !existsSync(join(root, dir, 'package.json')))
      dir = dirname(dir);
    return dir;
  }

  const markdown = files.filter((f) => f.endsWith('.md'));
  const sources = files.filter((f) => SOURCE_EXT.test(f));
  const isPlan = (f: string) => f.startsWith('.plans/');

  // Relative markdown links resolve.
  for (const f of markdown) {
    const text = await read(f);
    const withoutCode = blankCode(text);
    for (const m of withoutCode.matchAll(/\]\(([^)\s]+)\)/g)) {
      const target = m[1]!.split('#')[0]!;
      if (!target || /^[a-z]+:/i.test(target)) continue;
      if (!existsSync(join(root, dirname(f), target))) {
        report(f, lineOf(text, m.index!), `broken link: ${m[1]}`);
      }
    }
  }

  // Wikis: every note indexed, within budget, and every [[link]] resolves.
  const wikis = new Map<string, string[]>();
  for (const f of markdown.filter((f) =>
    /(^|\/)docs\/wiki\/[^/]+\.md$/.test(f),
  )) {
    const dir = dirname(f);
    wikis.set(dir, [...(wikis.get(dir) ?? []), basename(f, '.md')]);
  }
  for (const [dir, notes] of wikis) {
    const indexFile = join(dir, 'INDEX.md');
    const index = notes.includes('INDEX') ? await read(indexFile) : '';
    if (!index) report(indexFile, 0, 'wiki has no INDEX.md');
    for (const note of notes) {
      const f = join(dir, `${note}.md`);
      const text = await read(f);
      if (note !== 'INDEX' && !index.includes(`[[${note}]]`))
        report(f, 0, 'not listed in INDEX.md');
      const lines = text.trimEnd().split('\n').length;
      if (note !== 'INDEX' && lines > MAX_WIKI_LINES) {
        report(f, 0, `${lines} lines (budget ${MAX_WIKI_LINES}); split it`);
      }
      for (const m of blankCode(text).matchAll(
        /\[\[([^\]|#]*)(?:[#|][^\]]*)?\]\]/g,
      )) {
        const target = m[1]!.trim();
        if (target && !notes.includes(target)) {
          report(f, lineOf(text, m.index!), `broken wikilink: [[${target}]]`);
        }
      }
    }
  }

  // ADRs are numbered and carry a status.
  for (const f of markdown.filter((f) =>
    /(^|\/)docs\/decisions\/[^/]+\.md$/.test(f),
  )) {
    if (basename(f) === 'README.md') continue;
    if (!/^\d{4}-[a-z0-9-]+\.md$/.test(basename(f)))
      report(f, 0, 'ADR name must be NNNN-slug.md');
    if (!(await read(f)).includes('**Status:**'))
      report(f, 0, 'ADR has no **Status:** line');
  }

  // CLAUDE.md files hold instructions, not status.
  for (const f of markdown.filter((f) => basename(f) === 'CLAUDE.md')) {
    const text = await read(f);
    for (const m of text.matchAll(/^#+ .*\bstatus\b.*$/gim)) {
      report(
        f,
        lineOf(text, m.index!),
        'status section in CLAUDE.md; status lives in plans and issues',
      );
    }
  }

  // Plans are named for their issue; anything else (e.g. a plan-mode draft) is a stray.
  for (const f of files.filter((f) => isPlan(f) && f.endsWith('.md'))) {
    if (!/^\d+-[a-z0-9-]+\.md$/.test(basename(f))) {
      report(f, 0, 'plan must be named <issue>-<slug>.md');
    }
  }

  // Durable files never point at a specific plan.
  for (const f of [...markdown, ...sources].filter((f) => !isPlan(f))) {
    const text = await read(f);
    for (const m of text.matchAll(/\.plans\/[\w-]+\.md/g)) {
      report(
        f,
        lineOf(text, m.index!),
        `references a plan (${m[0]}); plans are temporary`,
      );
    }
  }

  // Code: docs paths resolve; open-question markers cite an issue.
  for (const f of sources) {
    const text = await read(f);
    for (const m of text.matchAll(/(?:\.\.\/)*docs\/[\w./-]+\.md/g)) {
      const ref = m[0];
      const candidates = [
        join(dirname(f), ref),
        join(packageRootOf(f), ref),
        ref,
      ];
      if (!candidates.some((c) => existsSync(join(root, normalize(c))))) {
        report(f, lineOf(text, m.index!), `broken docs path: ${ref}`);
      }
    }
    for (const m of text.matchAll(/\b(DECIDE|TODO|FIXME|XXX)\b(?!\(#\d+\))/g)) {
      const lineText = text.split('\n')[lineOf(text, m.index!) - 1]!;
      if (!/\/\/|\/\*|\*|\{\/\*/.test(lineText)) continue; // only comments
      report(
        f,
        lineOf(text, m.index!),
        `${m[1]} without an issue: write ${m[1]}(#N):`,
      );
    }
  }

  return problems;
}
