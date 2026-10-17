/** Fits inside a 65 × 25 frame with its border. */
export const HELP_COLUMNS = 63;
export const HELP_ROWS = 23;

/** The help shown by bare `/prog`, as a pane (mod) or printed (skill, CLI). */
export const HELP = `prog: keep a repo navigable across long breaks

  /prog status     where you are: branch, plans, next steps
  /prog resume     pick up the last session: commit its
                   finished work, then offer the next step
  /prog plan X     draft a plan for X; you approve it
  /prog plan       carry on with the active plan
  /prog done       close the plan: harvest it, then delete it
  /prog why F:L    why a line is the way it is
  /prog tidy       sweep docs and plans for drift
  /prog setup      add prog here, or update its rules

How it fits together
  issues      the backlog: everything not started
  .plans/     work in flight, one per issue; deleted when
              done, after anything lasting moves out
  commits     the why behind each line (/prog why reads it)
  docs/       how things work now, and the big decisions
  CLAUDE.md   the rules, in the marked prog block

Plain words work too: "where was I?", "carry on",
"why is this like this?", "tidy up".`;
