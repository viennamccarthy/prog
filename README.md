# prog

A personal Claude Code plugin for keeping repos navigable across long breaks: one home per question, temporary plans in `.plans/`, the *why* in commit bodies, and a mechanical docs check. The name comes from "progression", as FFXIV raiders use it.

## Install

```
/plugin install prog-tracker --marketplace viennamccarthy/prog
```

Needs [Bun](https://bun.sh) on the PATH. Then, in a repo: `/prog setup`.

## Using it

Type `/prog` for the help. Each command does one named thing:

| Command | Does |
|---|---|
| `/prog` | the help (a pane; no model turn) |
| `/prog status` | where you are: branch, plans, next steps (a pane; no model turn) |
| `/prog resume [notes]` | pick up the last session: commit its finished work, offer what's next |
| `/prog plan <task>` | draft a plan in `.plans/`; you read it and say go |
| `/prog plan` | carry on with the active plan |
| `/prog done [notes]` | close the plan: move what lasts into docs or issues, then delete it |
| `/prog why <file:line>` | why a line is the way it is: blame → commit → PR → issue → docs |
| `/prog tidy [focus]` | sweep docs and plans for drift |
| `/prog setup [notes]` | add prog to a repo, or update its rules block |

Words after a command reach Claude as instructions. Plain words work too: "where was I?", "carry on", "why is this like this?", "tidy up".

Every session in a git repo opens with the active plans and their next step (or a one-line setup offer), and a dim band above the prompt shows `◆ <plan> <done>/<total> · <branch> +<uncommitted>`.

## Where things live

Every question has one home.

| Question | Home |
|---|---|
| What am I in the middle of? | `.plans/<issue>-<slug>.md`: in-flight multi-step work only, deleted when done |
| What's next, eventually? | GitHub issues |
| Why is this line like this? | The commit body, via `git blame` |
| What could I break by changing it? | A short trap comment at the line, ideally backed by a test named after the rule |
| How does this work now? | `docs/wiki/` |
| Why is the system built this way? | `docs/decisions/` (ADRs) |
| How does git / CI / deployment work in general? | `docs/learning/` |
| What do the authoritative sources say? | `docs/reference/` |

The binding rules live in each repo's root `CLAUDE.md`, between `<!-- prog vN -->` and `<!-- /prog -->`, so they hold in cloud sessions and for other agents too. `/prog setup` writes and upgrades that block; the session-start message says when it's out of date.

### Plans

- A plan always belongs to an issue: frontmatter `issue`, `branch`, `status` (`draft`, `active`, `blocked: …`); sections **Goal**, **Decisions** (each attributed: who, when), **Steps** as checkboxes.
- `/prog plan <task>` researches, files or reuses the issue, writes a `draft` and waits. Approval sets `status: active` and creates the branch.
- Tick steps as they land; a changed step is struck through with its replacement beneath.
- Native `/plan` and plan mode are a separate method: their drafts are scratch and prog never adopts them.
- Nothing durable links to a plan.

### Commits, comments, docs

- The commit body records the why. Reference the issue; non-trivial work lands by squash-merged PR.
- Comments: one-line usage TSDoc on exports where name and type don't say it; otherwise only trap warnings. No history, issue numbers or plan names; open questions as `DECIDE(#N):` / `TODO(#N):` with the issue open.
- Wiki notes describe the present, one concept each, ≤150 lines, listed in `INDEX.md`. ADRs are `NNNN-slug.md` with a Status line. Markdown is never hard-wrapped.
- `prog check-docs` (in CI: `bunx --bun github:viennamccarthy/prog#v<version> check-docs`) fails on broken links and docs paths, unindexed or oversized wiki notes, misnamed plans, durable files pointing at a plan, and markers without an issue. `/prog tidy` covers what a script can't judge.

## How it's built

| Layer | Works in | Holds |
|---|---|---|
| Repo-carried | everywhere, incl. cloud sessions | the `CLAUDE.md` rules block, `.plans/`, the docs check in CI |
| Plugin | any local Claude Code with prog installed | skills, the session-start hook, `bin/prog`, the `session-recon` agent |
| Mod | local Claude Code (early-access API) | `/prog` itself, the panes, the band. Nothing depends on it: `/prog-tracker:cmd …` does the same without it |

`bin/prog` holds the deterministic parts (`status`, `check-docs`, `hook session-start`, `template`, `sessions`, `help`); skills, hook, mod and CI all call it. See [ADR 0001](docs/decisions/0001-prog-plugin.md) for why.

## Developing prog

`~/Dev/prog` is the installed plugin, read in place by every session: it stays on `main`, and all work happens in a worktree.

```
git config core.hooksPath githooks         # once per clone
git worktree add .worktrees/<issue>-<slug> -b <issue>-<slug> main
```

The hooks in `githooks/` refuse commits in the main checkout and switch it back to `main` if a branch is checked out there; worktrees are unaffected. After a PR merges: `git pull` in the main checkout, then `/reload-plugins`.

Checks: `bun test`, `bun run typecheck`, `claude plugin test .` (the mod), `claude plugin validate .`, `prog check-docs`. A release bumps `version` in both `package.json` and `.claude-plugin/plugin.json` (a test holds them equal) and tags `v<version>`, the tag repos pin in CI.

## Docs

Docs live in `docs/` at each doc root, holding only the subfolders that root needs (`wiki/`, `decisions/`, `learning/`, `reference/`).

| Doc root | Has |
|---|---|
| `/` | `decisions/` |
