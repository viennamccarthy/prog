---
issue: 1
branch: 1-prog-v2
status: active
---

# Repo system v2: `prog`, one plugin

## Goal

Turn the v1 bundle (personal skills + a hand-wired settings hook) into one installable, versioned plugin called **prog**, so the system comes to Vienna instead of relying on her remembering it, and drops into any repo.

## v1 (what gets ported)

| Piece | v1 (user-level) | Becomes |
|---|---|---|
| Guide | `repo-system` skill's `README.md` | prog repo `README.md` |
| Setup skill + `templates/` | `repo-system` skill | `skills/setup/` + `templates/` |
| `plan` skill (shadows built-in `/plan`) | `plan` skill | `skills/plan/`; override dropped (see Decisions) |
| `why`, `tidy` | `why`, `tidy` skills | `skills/why/`, `skills/tidy/` |
| `pick-up` + `session-recon` agent + `scripts/{digest,rank-sessions}.py` | `pick-up` skill, user agents | folded into `/prog` (no-arg); agent → `agents/session-recon.md` |
| SessionStart hook | user settings → `session-start.sh` | `hooks/hooks.json` calling `bin/prog hook session-start` |
| `check-docs.ts` | copied into each repo's `scripts/` | `bin/prog check-docs`, run in CI via a pinned `bunx` |

## Design constraints (Vienna's working style)

- Solo, long breaks, poor memory, and the system itself is subject to that: entry points must come to her (she'd forgotten `pick-up` existed).
- Work arrives mid-flow; branch/plan hygiene must survive interruptions.
- Wants state visible and brief; markdown plans with checkboxes; hates stale plans of unknown status; dislikes beads.
- Lean everything; self-healing over discipline; git-native records.
- Exportable across projects; an auditable, attributed decision trail.

## Design

### Shape

- New repo `prog`, public on GitHub. It is both the plugin and a one-plugin marketplace (`.claude-plugin/marketplace.json`, `source: "./"`).
- Vienna's machine: `claude plugin marketplace add <local clone>`, then install at user scope. A local-folder marketplace is read **in place**: edit, `/reload-plugins`, no version bump. This also gives a stable path for anything outside the plugin.
- Other machines: `/plugin install prog --marketplace <owner>/prog`. `plugin.json` `version` gates their updates (semver, git tag per release).
- Installed at **user scope**, active everywhere. Behaviour per repo is decided by the marker in that repo's `CLAUDE.md`, not by per-project `enabledPlugins`: that wouldn't auto-install on a fresh machine, and cloud sessions ignore it anyway.

### Three layers, most robust first

| Layer | Works in | Holds |
|---|---|---|
| Repo-carried | everywhere, incl. cloud sessions and other agents | `CLAUDE.md` rules block, `.plans/`, docs check in CI |
| Plugin (skills, hooks, agent, `bin/`) | any local CLI with prog installed | automation, the guide |
| Mod (hooks module) | local CLI only; early-access API | the band above the prompt. Nothing depends on it |

### Command surface

- **`/prog`** (no args): "what was I doing?". Branch, uncommitted work, `.plans/` (status and next step each), recent commits. Spawns `session-recon` only when uncommitted work isn't explained by a plan, or the last session ended on an open question. In a repo without the marker: the same git-level resume, plus an offer of `/prog setup`.
- **`/prog plan X`** / **`/prog plan`**: start / resume a repo plan. **`/prog done`**: harvest and delete. **`/prog why <file:line>`**, **`/prog tidy`**, **`/prog setup`** (bootstrap or upgrade the repo's block).
- Separate skills underneath (`prog:plan`, `prog:why`, …) so natural phrases ("carry on", "why is this like this?") still trigger them. The root `prog` skill only routes.
- `bin/prog` is on Claude's Bash PATH while the plugin is enabled. It holds the deterministic parts: `status [--json|--line]`, `check-docs`, `hook <event>`. Written in TS with a `#!/usr/bin/env bun` shebang, and also published as the package `bin`, so CI runs the same code.

### Plans: two methods, never mixed

| | Native `/plan` and Shift+Tab | `/prog plan X` |
|---|---|---|
| Changed by prog | never, in any repo | n/a |
| Writes to | `~/.claude/plans/<random-words>.md` (scratch) | `.plans/<issue>-<slug>.md` |
| Use for | thinking a single-session change through | multi-step work |
| Approval | plan mode's dialog | Vienna reads the file and says go: `status: draft` → `active`, then the branch |
| Seen by prog | never: not resumed, shown or adopted | yes |

`/prog plan` doesn't use plan mode. It researches read-only under its skill's instructions, files or reuses the issue, writes the draft into `.plans/`, and waits. Starting execution in a fresh context = `/clear`, then `/prog`.

### Hooks

- **SessionStart** (startup, clear, resume): `prog hook session-start`.
  - Marked repo: active plans + next step; a `draft` plan awaiting approval; "rules block is vN, plugin is vM, `/prog setup` to update"; "last tidy over 30 days ago" (timestamp per repo in `${CLAUDE_PLUGIN_DATA}`).
  - Unmarked git repo: one-line setup offer. Silent outside git.
  - Replaces v1's weekly-scheduled-tidy idea.
- Phase 2, only if needed: a **Stop** hook nudging once when commits landed on a plan's branch since the plan file last changed (uses `stop_hook_active` to avoid loops).
- Dropped: the UserPromptSubmit "mid-flow" guess (noisy). The band shows the state instead.

### Band (mod)

A `ui.render` hook on `AbovePrompt`, only in marked repos: one short dim line, `◆ 12-search 3/9 · main +2` (plan, progress, any other plans, branch, uncommitted count), cut with `…` at the screen edge. No next step and no buttons: the band only says where you are, and `/prog` says what's next. *(Vienna, 17 Oct 2026, after testing on a small screen)* The hint line under the prompt was rejected: it's cut off entirely on a small screen. It reads `prog status --json`, so it has one source of truth with the hook and the skills. If the mod API breaks on an update, only the band goes.

### Per-repo marker and versioning

- The `CLAUDE.md` block is wrapped in `<!-- prog v2 -->` … `<!-- /prog -->`. This one marker serves detection (replacing v1's grep for "repo system"), the version comparison, and idempotent re-sync by `/prog setup`.
- CI runs `bunx github:<owner>/prog#v2.x.y check-docs`. The pin is that repo's system version; no vendored copy.
- Cloud sessions load no plugins: the block's binding rules are the fallback, by design.

## Decisions

- One home per question; plans only for in-flight multi-step work, `<issue>-<slug>.md`, harvested then deleted; commit bodies are the micro-ADR; `docs/{wiki,decisions,learning,reference}` per doc root; trap-only comments. *(Vienna, 17 Oct 2026, v1)*
- The guide lives with the system, not per repo; each repo keeps the binding rules in its root `CLAUDE.md`. *(Vienna, 17 Oct 2026, v1)*
- `execute` retired into `plan`. *(Vienna, 17 Oct 2026, v1)*
- Name and entry point: **prog** (from "progression", as FFXIV raiders use it); one command, `/prog`, which also absorbs `pick-up`. *(Vienna, 17 Oct 2026)*
- **Supersedes the v1 "system owns `/plan`" decision:** native `/plan` and plan mode are left alone everywhere; `/prog plan` is a distinct method writing straight into `.plans/`; the two never mix. Reason: avoid two sources of plans and ambiguity about which method is in use. *(Vienna, 17 Oct 2026)*
- Plugin repo is public; CI pins the checker version instead of vendoring it. *(Vienna, 17 Oct 2026)*
- Live state shown as a band above the prompt (mod), not a ccstatusline segment. *(Vienna, 17 Oct 2026)*
- Cloud sessions are rare; the `CLAUDE.md` block is enough there, and no skills are vendored into repos. *(Vienna, 17 Oct 2026)*
- User-scope install; per-repo behaviour keyed off the `CLAUDE.md` marker. *(Claude, proposed 17 Oct 2026; follows from the cloud and public-repo decisions)*
- **Command surface:** one `/prog` entry, space-separated subcommands only; sub-skills hidden from the menu; short menu descriptions (cut off after 10-15 words on a small screen); plugin renamed `prog-tracker` for a more descriptive name. Bare `/prog` must be predictable: it shows help, never acts. *(Vienna, 17 Oct 2026)*
- **Command split:** `/prog` and `help` → help pane; `status` → printed state; `resume` → pick up the last session (commit finished work, offer the next step); `plan|done|why|tidy|setup` as before. Help and status run in the mod without a model turn; the skill is the fallback for all of them. *(Claude, proposed 17 Oct 2026; Vienna asked for help-as-bare and a plain "where was I")*

## Steps

- [x] **Spike** (throwaway, `claude --plugin-dir`): confirm (a) a plugin skill named `prog` answers bare `/prog`; (b) one `hooks/hooks.json` can carry both `hooks` and `modules`, so the band ships in the same plugin; (c) `bin/` is on the Bash PATH and a `#!/usr/bin/env bun` script runs from it; (d) `bunx github:<owner>/<repo>#<tag> <bin>` works from a GitHub Actions runner. Any "no" → revise the Design here before building. Also (e): typing `/prog` lists the namespaced sub-skills, and the mod's `prompt.autocomplete` hook completes `/prog pl` → `plan`.
  *NOTE: throwaway plugin in the local dev-mods folder (delete after). Results, 17 Oct: (a) ✓ typing `/prog hello` runs `prog:prog` (the transcript shows `/prog:prog`; both appear in the typeahead). (b) ✓ classic hooks and `modules` share one `hooks.json`; passes validate and tsc. (c) ✓ `prog status --line` runs by bare name from Claude's Bash. (e) ✓ namespaced sub-skills are listed, and `/prog pl` completes to `plan`. (d) ✓ locally, 17 Oct: `bunx --bun github:viennamccarthy/prog#1-prog-v2 status --line` installs and runs; still to see it on an Actions runner, at the first v1-repo migration. Band: visible, but the full next step is too long on narrow screens, and there's a blank row above the prompt that the API doesn't let a mod remove. Trying `wrap="truncate-end"` plus the alternative slot, a `tail` on the `PromptHint` line (no extra row). Gotchas: mod helpers that take `$` must be top-level function declarations; quote `${CLAUDE_PLUGIN_ROOT}` in hook commands.*
- [x] Create the `prog` repo (git init, public GitHub repo, issue #1 "v2"); move this plan in as `.plans/1-prog-v2.md`; adopt the repo system in prog itself (it's the first dogfood).
  *NOTE: adopted with the v1 block wrapped in the v2 marker, `scripts/check-docs.ts` + `docs:check` + a CI job; step 3 replaces the script with `bin/prog check-docs`.*
- [x] Port `check-docs.ts` and `session-start.sh` into `bin/prog` (`check-docs`, `status`, `hook session-start`), with tests for the plan parsing and the marker/version logic.
  *NOTE: logic in `src/`, `bin/prog` is a two-line entry. Gaps filled (Claude, proposed 17 Oct 2026; confirmed by Vienna): the block version is its own constant (`BLOCK_VERSION`), bumped only when the block text changes, not tied to the plugin's semver; an unmarked block that says "repo system" counts as v1, so v1 repos get the upgrade nudge; `prog mark-tidy` records a tidy (the `tidy` skill must call it), and a repo seen for the first time is stamped then, so the nag starts a month later.*
- [x] Port the skills: `prog` (router + resume, absorbing `pick-up`), `plan` (draft-in-`.plans/` flow, no plan mode), `why`, `tidy`, `setup` (inserts or upgrades the marked block, wires the CI step); `agents/session-recon.md` + its scripts. Skill text uses `${CLAUDE_PLUGIN_ROOT}` for templates.
  *NOTE: deviations (Claude, 17 Oct 2026): skills and the agent reach templates and session scripts through `prog template <name>` and `prog sessions rank|digest` rather than `${CLAUDE_PLUGIN_ROOT}` in skill text (unverified there; `bin/` on PATH is verified). Bare `/prog` commits finished work as `pick-up` did, but only continues the plan when asked to pick up or carry on; for "where was I?" it offers. A plan draft is committed as the branch's first commit at approval. The CI pin comes from `package.json` `version` (now `2.0.0`). Templates are skipped by the docs check (placeholders). prog's own block is synced to the new template.*
- [x] Manifest, marketplace, `hooks/hooks.json`; `claude plugin validate`.
  *NOTE: validate passes; its one warning (root `CLAUDE.md` isn't shipped as plugin context) is expected, since that file is for this repo's sessions. A test keeps `plugin.json` and `package.json` versions equal. Not yet loaded in a live session: that happens at the switch-over.*
- [x] Switch over on Vienna's machine: marketplace add the local clone, install at user scope, then remove v1 (user skills `repo-system`, `plan`, `why`, `tidy`, `pick-up`; user agent `session-recon`; the SessionStart entry in user settings). Vienna edits user settings herself (sandbox-protected); the task-recording rule in the user `CLAUDE.md` is updated to name prog.
  *NOTE: done by Vienna, 17 Oct 2026; working.*
- [x] Command surface, plugin side: rename the plugin to `prog-tracker` (skill stays `prog`; marketplace `prog`); sub-skills get `user-invocable: false` (hidden from the `/` menu, still model-invocable and routed to); `prog` only routes, and bare `/prog` shows the help and `prog status`; the old bare behaviour becomes a hidden `resume` skill; `prog help` prints the help (≤65 columns × 25 rows), shared by skill and mod; `prog status` invites `/prog setup` in an unmarked repo. Vienna reinstalls as `prog-tracker@prog`.
  *NOTE: validate accepts `user-invocable` and `disable-model-invocation` (the router is user-only, so the model never runs it on a guess). Startup message now ends "/prog resume picks up; /prog help lists the rest."*
- [ ] Spike the mod-side `/prog` (throwaway in dev-mods): (f) does `$.command.register({ name: 'prog' })` clash with the skill's short name; (g) does a `command.describe` hook hide `/prog-tracker:prog` from the typeahead; (h) does `command.run` hand `/prog plan x` to the skill via `$.command.run`, and what does the transcript echo; (i) the help pane: `$.ui.open` with `focus`, `closeOnEscape`, `rows: 25`, `columns: 65`, on a small screen. Any "no" → revise here.
- [ ] ~~Band mod (`hooks/register.tsx`, reading `prog status --json`), with a `claude plugin test`.~~
- [ ] Mod (`hooks/register.tsx`), with a `claude plugin test`: `/prog` registered top-level; bare and `help` open the help pane, `status` prints `prog status` (neither starts a model turn); other subcommands go to the skill; `prompt.autocomplete` completes subcommands with short descriptions; the prefixed entry is hidden; plus the band, reading `prog status --json`.
- [ ] Migrate each v1 repo: wrap its block in the marker, replace `scripts/check-docs.ts` + `docs:check` with the pinned `bunx` in CI, check its active plans still show.
  *NOTE: the CI pin `#v2.0.0` only resolves once that tag exists; tag first, or pin a pre-release tag for the trial migration.*
- [ ] Tag `v2.0.0`.
- [ ] Decide, then fix: `autoMemoryDirectory` in user settings is a relative path (`./.claude/memory`). The setting only accepts an absolute or `~/` path (docs: memory#storage-location), so the relative value is invalid and sessions fall back to the default `~/.claude/projects/<project>/memory/`. It isn't deprecated, and there's no variable for a per-project path. Likely just remove the setting (default is right: private, and project state lives in the repo anyway); confirm with Vienna.
- [ ] Close: harvest into prog's `README.md` (the guide) and `docs/decisions/0001-prog-plugin.md`; delete the plan.
