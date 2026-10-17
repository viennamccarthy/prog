---
name: tidy
description: Drift sweep for a repo using prog — run the docs check, then find what a script can't — stale wiki notes, finished or abandoned plans, closed issues still cited as pending, orphaned markers, stale CLAUDE.md content, over-commented code, out-of-date private memory — and fix or delete. Use when the user says "tidy up", "check the docs", "clean up", when the session-start message says a tidy is overdue, after a long break, or after a large piece of work lands.
---

# Tidy sweep

Keep the repo lean: fix what's wrong, **delete** what's no longer relevant. Follow the repo's root `CLAUDE.md` rules.

## 1. Mechanical

Run `prog check-docs`. Fix everything it reports.

## 2. Judgement

Check each, cheapest first. Use an `Explore` agent for broad reading. "Since the last tidy" means since the last `chore: tidy` commit (`git log --grep='^chore: tidy' -1`), or the last month if there is none.

- [ ] **Plans:** for each plan in `prog status`: issue closed, or every box ticked? Close it (`prog:plan`: harvest, delete). Untouched for weeks with no `blocked:` status, or a `draft` never approved? Ask the user whether it's still live. Stray files in `.plans/`: adopt as a plan or delete.
- [ ] **Pending designs:** for each `Pending #N` heading in a wiki, and each ADR marked "not yet implemented": if #N is closed, rewrite as current behaviour, or mark the ADR accepted.
- [ ] **Markers:** for each `DECIDE(#N)` / `TODO(#N)` in code, is #N still open? Closed means resolve or remove the marker.
- [ ] **Wiki accuracy:** for notes touched since the last tidy (`git log --since=<date> --name-only`), spot-check claims against code: names, paths, behaviour. Fix or delete stale claims. Remove history ("previously", "was changed to"); history belongs in git.
- [ ] **CLAUDE.md files:** instructions only. Remove status, dated text, and anything duplicating prog's rules block. Don't edit inside the `<!-- prog … -->` block; `/prog setup` owns it.
- [ ] **Comments:** in files changed since the last tidy, remove history, issue numbers, plan codenames and restated code. Keep trap comments.
- [ ] **Issues:** open issues whose work has landed (search commits for `#N`): suggest closing them to the user; don't close them yourself.
- [ ] **Private memory:** project state found in Claude's memory directory belongs in the repo. Move it to docs or issues, and delete stale or duplicated memories.
- [ ] **Learning notes:** flag any that describe a mechanism the repo no longer uses.

## 3. Report and commit

Commit as `chore: tidy` (or `docs: …`), with a body listing what was removed and why. Then run `prog mark-tidy`, which resets the session-start reminder. Tell the user in a few lines: what was fixed, what was deleted, and what needs their decision.
