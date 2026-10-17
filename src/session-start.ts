import { formatSummary, type RepoStatus } from './status';

export interface HookResponse {
  systemMessage: string;
  hookSpecificOutput: {
    hookEventName: 'SessionStart';
    additionalContext: string;
  };
}

/** SessionStart response for a repo; null outside git (the hook stays silent). */
export function sessionStart(
  s: RepoStatus | null,
  tidyOverdueDays: number | null = null,
): HookResponse | null {
  if (!s) return null;

  if (s.blockVersion === null) {
    return response(
      `prog isn't set up in ${s.repo}. Run /prog setup to add it, or ignore this.`,
      "This repo doesn't use prog. Don't set it up unless the user asks; the startup message has already offered it.",
    );
  }

  const notes: string[] = [];
  for (const p of s.plans.filter((p) => p.status === 'draft'))
    notes.push(`${p.name} is a draft awaiting approval: read it, then say go.`);
  if (s.blockVersion < s.currentBlockVersion)
    notes.push(
      `The CLAUDE.md rules block is v${s.blockVersion}; prog's is v${s.currentBlockVersion}. Run /prog setup to update it.`,
    );
  if (tidyOverdueDays !== null)
    notes.push(`Last tidy was ${tidyOverdueDays} days ago. Run /prog tidy.`);

  const summary = [formatSummary(s), ...notes, '/prog resume picks up; /prog help lists the rest.'].join(
    '\n',
  );
  return response(
    summary,
    `This repo uses prog: binding rules in the marked block of root CLAUDE.md. ${summary}`,
  );
}

function response(systemMessage: string, context: string): HookResponse {
  return {
    systemMessage,
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext: context,
    },
  };
}
