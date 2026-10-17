import { checkDocs } from './check-docs';
import { sessionStart } from './session-start';
import { formatLine, formatSummary, gitRoot, repoStatus } from './status';
import { markTidy, tidyOverdue } from './tidy';

const USAGE = `usage: prog <command>
  status [--json|--line]   repo state: plans, branch, uncommitted work
  check-docs               mechanical docs check (exits 1 on problems)
  hook session-start       SessionStart hook response (JSON)
  mark-tidy                record that this repo was just tidied`;

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
  default:
    console.error(USAGE);
    process.exit(cmd ? 2 : 0);
}
