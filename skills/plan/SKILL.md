---
name: plan
description: Start, resume and close repo plans (.plans/<issue>-<slug>.md). "/prog plan <task>" drafts a plan for approval; bare "/prog plan" resumes the active one; "/prog done" harvests and deletes it. Use without being asked whenever work will span more than one sitting or several commits ("let's build X", a large issue); when the user says "carry on", "continue the plan", "next step", or approves a draft ("go", "looks good"); and when work is finished ("that's done", "wrap this up"). Skip for small single-session changes. Never touches native /plan or plan mode.
argument-hint: "[task to plan — omit to resume]"
user-invocable: false
---

# Plans

Plans hold only **in-flight** work: issues hold the backlog, commit bodies the history, docs what lasts. The repo's root `CLAUDE.md` rules win where they differ from this.

Native `/plan` and plan mode are a separate method: their drafts are scratch, outside the repo. Never adopt, resume or move them into `.plans/`, and don't enter plan mode from here.

Mode: a task in the arguments → **Start**. None, "carry on", or approval of a draft → **Resume**. Work finished, or `/prog done` → **Close**.

## Start

1. `prog status`. If a plan already covers this work, **Resume** it.
2. **Research read-only.** Read code, issues and docs; delegate broad searches to an `Explore` agent. Don't change any file except the draft.
3. **Find or file the issue:** `gh issue list --search …`, else `gh issue create` (the problem and the outcome; the plan is the route).
4. **Write the draft** to `.plans/<issue>-<slug>.md` from `prog template plan`, keeping `status: draft`: **Goal**; **Decisions**, each attributed (who, when; at foundation moments also ask of inherited choices: who decided, and does the premise still hold?); **Steps** as checkboxes concrete enough to run cold, naming files and how each is verified; the **Close** step last.
5. **Stop.** Give the path and a few lines on the approach, and ask the user to read it and say go. Don't start the work.

On approval:

1. Set `status: active`. Branch `<issue>-<slug>` from an up-to-date main (sort out unrelated uncommitted work with the user first), and commit the plan as the branch's first commit.
2. If research filled the context, suggest `/clear` then `/prog` to execute fresh; otherwise **Resume**.

## Resume

1. `prog status`: one active plan → take it; several → ask which, showing each next step; a `draft` → it's awaiting approval, so ask; none → say so and offer **Start**.
2. Check out the plan's branch. Re-read the plan; never rely on chat history for execution state.
3. Work from the first unchecked step:
   - Tick each step (`- [x]`) as it lands. Minor deviation: tick it and append `*NOTE: …*`. A step changes: strike it (`- [ ] ~~…~~`) and add the replacement beneath **before** doing the work. Knock-on effects for later steps: stop and discuss.
   - Stay in scope; anything out of scope that matters becomes an issue.
   - Verify as the plan says before ticking. Commit at natural checkpoints; bodies carry the *why* and never mention the plan.
   - If the plan has phases, stop at the end of each unless told otherwise.
4. Keep `status` current: `draft`, `active`, `blocked: <reason>`.

## Close

When every box is ticked, or the user says it's done:

1. **Harvest.** Read the plan once more and move out anything durable: foundation decisions → ADR (`docs/decisions/`, from `prog template adr`); how things now work → `docs/wiki/`; follow-ups → issues. Line-level rationale belongs in commit bodies; if missing, put it in the PR description.
2. **Delete the plan** in the final commit or PR (`Fixes #N`). Run `prog check-docs`.
3. Tell the user what was harvested where, in a short list.
