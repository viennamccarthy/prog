import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkDocs } from './check-docs';
import { sessionStart } from './session-start';
import { formatLine, formatSummary, gitRoot, repoStatus } from './status';
import { markTidy, tidyOverdue } from './tidy';

const USAGE = `usage: prog <command>
  status [--json|--line]   repo state: plans, branch, uncommitted work
  check-docs               mechanical docs check (exits 1 on problems)
  hook session-start       SessionStart hook response (JSON)
  mark-tidy                record that this repo was just tidied
  template <name>          print a template (claude-md-block, plan, adr, ci-docs-check)
  sessions rank <id>       rank this project's past sessions (for session-recon)
  sessions digest <id>     compact transcript of a past session
  --version                prog's version (the tag CI pins)`;

const PKG = join(import.meta.dir, '..');
const version = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8'))
  .version as string;

const [cmd, ...args] = process.argv.slice(2);
const cwd = process.cwd();
const dataDir = process.env.CLAUDE_PLUGIN_DATA;

switch (cmd) {
  case 'status': {
    const s = repoStatus(cwd);
    if (args.includes('--json')) console.log(JSON.stringify(s));
    else if (!s) {
      console.error('prog: not in a git repo');
      process.exit(1);
    } else if (args.includes('--line')) console.log(formatLine(s));
    else console.log(formatSummary(s));
    break;
  }
  case 'check-docs': {
    const root = gitRoot(cwd);
    if (!root) {
      console.error('prog: not in a git repo');
      process.exit(1);
    }
    const problems = await checkDocs(root);
    if (problems.length) {
      console.error(`docs check found ${problems.length} problem(s):\n`);
      for (const p of problems) console.error(`  ${p}`);
      process.exit(1);
    }
    console.log('docs check passed');
    break;
  }
  case 'hook': {
    if (args[0] !== 'session-start') {
      console.error(`prog: unknown hook ${args[0] ?? '(none)'}`);
      process.exit(2);
    }
    // A failing hook must never get in the way of starting a session.
    try {
      const s = repoStatus(cwd);
      const overdue =
        s && s.blockVersion !== null && dataDir
          ? tidyOverdue(dataDir, s.root, Date.now())
          : null;
      const out = sessionStart(s, overdue);
      if (out) console.log(JSON.stringify(out));
    } catch {}
    break;
  }
  case 'mark-tidy': {
    const root = gitRoot(cwd);
    if (!root || !dataDir) {
      console.error('prog: needs a git repo and CLAUDE_PLUGIN_DATA');
      process.exit(1);
    }
    markTidy(dataDir, root, Date.now());
    break;
  }
  case '--version':
    console.log(version);
    break;
  case 'template': {
    const templates: Record<string, string> = {
      'claude-md-block': 'claude-md-block.md',
      plan: 'plan.md',
      adr: 'adr.md',
      'ci-docs-check': 'ci-docs-check.yml',
    };
    const file = templates[args[0] ?? ''];
    if (!file) {
      console.error(`prog: template is one of ${Object.keys(templates).join(', ')}`);
      process.exit(2);
    }
    const text = readFileSync(join(PKG, 'templates', file), 'utf8');
    process.stdout.write(text.replaceAll('{{version}}', version));
    break;
  }
  case 'sessions': {
    const script = { rank: 'rank-sessions.py', digest: 'digest.py' }[args[0] ?? ''];
    if (!script) {
      console.error('prog: sessions rank|digest <session-id> [options]');
      process.exit(2);
    }
    const r = Bun.spawnSync(['python3', join(PKG, 'scripts', script), ...args.slice(1)], {
      stdio: ['inherit', 'inherit', 'inherit'],
    });
    process.exit(r.exitCode ?? 1);
  }
  default:
    console.error(USAGE);
    process.exit(cmd ? 2 : 0);
}
