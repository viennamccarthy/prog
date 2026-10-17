---
name: prog
description: Where was I? Entry point to prog. Bare /prog resumes — branch, uncommitted work, plans and their next step, and the last session's loose ends; `/prog plan|done|why|tidy|setup …` routes to those skills. Use when the user asks "what was I doing?" / "where was I?", says to pick up or finish off the last session, or at the start of a fresh session or after /clear.
argument-hint: "[plan|done|why|tidy|setup] [args]"
---

# prog

## Route

By the first word of the arguments, invoke the matching skill with the Skill tool, passing the remaining arguments:

| First word | Skill |
|---|---|
| `plan` | `prog:plan` (start with a task, resume without) |
| `done` | `prog:plan`, Close mode |
| `why` | `prog:why` |
| `tidy` | `prog:tidy` |
| `setup` | `prog:setup` |
| none, or anything else | **Resume**, below; then answer any question asked |

## Resume

1. **Read the repo:** `prog status`, `git status --short`, `git log --oneline -8`. A plan is the durable record of in-flight work.
2. **Decide whether to look at the last session.** Spawn the `prog:session-recon` agent only when:
   - uncommitted changes aren't explained by a plan's current step, or
   - the user asks to finish off or pick up the last session, or
   - there is no plan and recent commits don't explain where things stand.

   It runs on its own model; don't override it. Prompt: *"Current session id: ${CLAUDE_SESSION_ID}. Working directory: the project root. Find the previous session that owns the uncommitted work here (or the most recent meaningful session if there is none), and report per your instructions."* Trust its report; check narrowly only what looks wrong (e.g. a file list that doesn't match `git status`). Where it disagrees with a plan, the plan wins; say so.
3. **Act**, in this order, on whichever apply:
   - [ ] **Commit** finished work the report lists. Invoking prog's resume is standing permission to commit it without asking. One commit per recommended entry, staging only its files (`git add -- <paths>`, never `-A`), following the repo's commit rules. Never commit files listed as "not from the session"; mention them. Don't push unless the repo's instructions say to.
   - [ ] **Continue** unfinished work or the active plan's first unchecked step (per `prog:plan`) when the user asked to pick up, carry on or finish off. When they only asked where they were, show the next step and offer to continue.
   - [ ] **Re-ask** blocking questions from the last session, quoting them with the context needed to answer.
   - [ ] **Raise** the other open threads.
4. **Summarise** briefly: plans and their next step, which session was picked up (if any), commits made (short hash and subject), what was continued, what needs the user.

In a repo without prog's block in `CLAUDE.md`, do the same git-level resume (`prog status` still shows branch and uncommitted work), then add one line: `/prog setup` would add prog here.
