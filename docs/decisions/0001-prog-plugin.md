# 0001. One plugin, prog-tracker, with /prog as its single entry point

- **Status:** accepted
- **Decided:** Vienna, 17–18 Oct 2026 (user-scope install keyed off the marker: proposed by Claude, accepted)

## Context

The repo system v1 was personal skills plus a hand-wired SessionStart hook, copied per machine, with `check-docs.ts` vendored into each repo. Its entry points relied on remembering them (`pick-up` was forgotten), and it couldn't be installed elsewhere or versioned.

The constraints are Vienna's working style: solo, long breaks, poor memory (which the system itself is subject to), work arriving mid-flow, state wanted visible and brief, stale plans of unknown status disliked, git-native records, an attributed decision trail.

## Decision

- **One public plugin, `prog-tracker`**, that is also its own one-plugin marketplace. Installed at user scope; per-repo behaviour comes from the `<!-- prog vN -->` block in root `CLAUDE.md`, not per-project settings (those don't auto-install and cloud sessions ignore them). Rejected: per-project enablement; vendoring skills into repos.
- **Three layers, most robust first:** the repo-carried block, `.plans/` and CI docs check work everywhere; the plugin's skills, hook and `bin/prog` work wherever it's installed; the mod is polish only.
- **One command, `/prog`**, with space-separated subcommands that each do one named thing. Bare `/prog` only shows help; resuming is an explicit `/prog resume`. Sub-skills are hidden from the `/` menu but still model-invoked from natural phrases. Rejected: colon sub-commands (`/prog:plan`) alongside, which doubled every route.
- **The mod registers `/prog`**, because the menu shows a plugin skill as `/<plugin>:<skill> (<short>)` and a mod can't rename it. A plugin can't register a name its own skill answers to, so the router skill is `cmd`, hidden; `/prog-tracker:cmd` is the fallback. Help and status are answered by the mod in a pane with no model turn.
- **Native `/plan` and plan mode are left alone**; `/prog plan` writes drafts straight into `.plans/`, so there is one source of repo plans. Supersedes v1's "the system owns `/plan`".
- **`bin/prog` holds everything deterministic** (status, docs check, hook, templates); CI runs the same code pinned by tag: `bunx --bun github:viennamccarthy/prog#v<version> check-docs`. The rules-block version is separate from the plugin's semver, so a patch release doesn't ask every repo to re-run setup.

## Consequences

- One install line on a new machine; repos follow the system without the plugin, at the block's level.
- The mod API is early access: if it breaks, `/prog` and the band go, and `/prog-tracker:cmd` remains.
- The main checkout is the installed plugin, read in place: development happens in worktrees, enforced by `githooks/`.
- `package.json` and `plugin.json` versions move together (a test holds them), and each release is a tag that repos pin.
