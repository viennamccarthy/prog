---
name: setup
description: Add prog to a repo, or upgrade its rules block — the marked block in root CLAUDE.md, docs/ folders, the docs check in CI, and migrating existing plans and TODOs. Use when the user asks to set up or install prog (or "the repo system") in a project, accepts the session-start offer, or when the session-start message says the rules block is out of date.
user-invocable: false
---

# Set up or upgrade prog in a repo

Goals: **maintainable** (few rules), **navigable** (from any line, find why it exists and what to watch for), **self-healing** (drift surfaces mechanically; stale material is deleted).

Run `prog status --json` and `prog --version`, then pick the path by `blockVersion` against `currentBlockVersion`. Work on a branch (or main if the repo has no branch policy). Confirm the plan with the user before changing anything.

## Fresh: `blockVersion` is null

- [ ] **Survey:** existing docs dirs, wikis, plans, TODO files, CLAUDE.md files, the issue tracker. Map each to its new home; ask before deleting anything with unharvested content.
- [ ] **Rules block:** append `prog template claude-md-block` to the root `CLAUDE.md` (create it if missing). Drop lines that don't apply (e.g. TSDoc in a repo without TypeScript); keep the markers exactly.
- [ ] **Docs folders:** create only the `docs/` subfolders each doc root needs (repo root; each package root in a monorepo). A wiki gets an `INDEX.md`.
- [ ] **README:** add a "Docs" section: one line on the layout, plus a table of doc roots and what each has.
- [ ] **CI:** add the docs check. If the repo has a CI workflow, add the `setup-bun` and `bunx` steps from `prog template ci-docs-check` to it; otherwise write that template to `.github/workflows/docs.yml`.
- [ ] **ADR 0001** (`prog template adr`) for any foundation decision already evident (stack, structure), attributed (who decided, when) or marked "inherited, unverified".
- [ ] **Migrate** existing plans and TODOs: in-flight → issue + `.plans/<issue>-<slug>.md` (`prog template plan`, `status: active`); finished → harvest, then delete; backlog → issues.
- [ ] Run `prog check-docs`; commit with a body explaining the adoption.

## Upgrade: `blockVersion` is below `currentBlockVersion`

- [ ] **Replace the block.** For a marked block, replace everything from `<!-- prog vN -->` to `<!-- /prog -->` with `prog template claude-md-block`. For v1 (no marker), replace the "How this repo works" section. Keep project-specific lines the old block had, and point out anything dropped.
- [ ] **CI:** bump the `bunx … prog#v…` pin to `v` + `prog --version`. For v1, remove `scripts/check-docs.ts` and its `docs:check` script, and add the CI step as in Fresh.
- [ ] Plans already in `.plans/` stay as they are.
- [ ] Run `prog check-docs`; commit with a body naming the old and new versions and what changed in the rules.

## Current: `blockVersion` equals `currentBlockVersion`

Say it's up to date. If the CI pin is behind `prog --version`, offer to bump it.
