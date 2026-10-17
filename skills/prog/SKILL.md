---
name: prog
description: Track work across breaks: status, resume, plan, done, why, tidy, setup
argument-hint: "[status|resume|plan|done|why|tidy|setup]"
disable-model-invocation: true
---

# prog

Route by the first word of the arguments. Do only what the row says; this command never acts on its own initiative.

| First word | Do |
|---|---|
| none, or `help` | Run `prog help` and show its output verbatim in a code block. Nothing else. |
| `status` | Run `prog status` and show its output verbatim in a code block. Nothing else. |
| `resume` | Invoke the `prog-tracker:resume` skill. |
| `plan` | Invoke `prog-tracker:plan` with the remaining arguments (a task starts a plan; none resumes). |
| `done` | Invoke `prog-tracker:plan` in Close mode. |
| `why` | Invoke `prog-tracker:why` with the remaining arguments. |
| `tidy` | Invoke `prog-tracker:tidy`. |
| `setup` | Invoke `prog-tracker:setup`. |
| anything else | Say it isn't a prog command and show `prog help`. |
