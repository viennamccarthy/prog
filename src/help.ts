/** Fits inside a 65 × 25 frame with its border. */
export const HELP_COLUMNS = 63;
export const HELP_ROWS = 23;

/** The help shown by bare `/prog`, as a pane (mod) or printed (skill, CLI). */
export const HELP = `prog: keep a repo navigable across long breaks

  /prog status          where you are: plans, next steps
  /prog resume [notes]  pick up the last session: commit its
                        finished work, offer what's next
  /prog plan <task>     draft a plan for the task, to approve
  /prog plan            carry on with the active plan
  /prog done [notes]    close the plan: harvest, then delete
  /prog why <file:line> why a line is the way it is
  /prog tidy [focus]    sweep docs and plans for drift
  /prog setup [notes]   add prog here, or update its rules
  Words after a command reach Claude as instructions.

How it fits together
  issues      the backlog: everything not started
  .plans/     work in flight, one per issue; deleted when
              done, after anything lasting moves out
  commits     the why behind each line (/prog why reads it)
  docs/       how things work now, and the big decisions
  CLAUDE.md   the rules, in the marked prog block

Plain words work too: "where was I?", "carry on",
"why is this like this?", "tidy up".`;

/** `/prog` subcommands as the typeahead lists them: what's inserted, the usage shown, a short description. */
export const SUBCOMMANDS = [
  { name: 'help', usage: 'help', summary: 'what prog does' },
  { name: 'status', usage: 'status', summary: 'where you are' },
  { name: 'resume', usage: 'resume [notes]', summary: 'pick up the last session' },
  { name: 'plan', usage: 'plan [task]', summary: 'draft a plan; none: carry on' },
  { name: 'done', usage: 'done [notes]', summary: 'close the plan' },
  { name: 'why', usage: 'why <file:line>', summary: 'why a line is like this' },
  { name: 'tidy', usage: 'tidy [focus]', summary: 'sweep for drift' },
  { name: 'setup', usage: 'setup [notes]', summary: 'add or update prog here' },
] as const;
