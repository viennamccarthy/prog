---
name: prog
description: Track work across breaks: status, resume, plan, done, why, tidy, setup
argument-hint: "[status|resume|plan|done|why|tidy|setup] [notes]"
disable-model-invocation: true
---

# prog

Route by the first word of the arguments. Do only what the row says; this command never acts on its own initiative. Any words after the subcommand are the user's: pass them to the skill as part of the request (a task, a file and line, or extra instructions to follow).

| First word | Do |
|---|---|
| none, or `help` | Run `prog help` and show its output verbatim in a code block. Nothing else. |
| `status` | Run `prog status` and show its output verbatim in a code block. Nothing else. |
| `resume` | Invoke `prog-tracker:resume`. |
| `plan` | Invoke `prog-tracker:plan` (a task starts a plan; none resumes). |
| `done` | Invoke `prog-tracker:plan` in Close mode. |
| `why` | Invoke `prog-tracker:why`. |
| `tidy` | Invoke `prog-tracker:tidy`. |
| `setup` | Invoke `prog-tracker:setup`. |
| anything else | Say it isn't a prog command and show `prog help`. |
