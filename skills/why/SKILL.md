---
name: why
description: Explain why a line, block or file is the way it is, and what to watch before changing it, by tracing git blame → commit → PR → issue → docs. Use when the user asks "why is this like this?", "why does this exist?", "can I change/remove this?", or points at a file/line before editing it; and before changing code whose purpose isn't obvious.
user-invocable: false
---

# Why is this like this?

Answer two questions about a piece of code: **(1) does it exist in its current form for a specific reason, and (2) is there anything non-obvious to know before changing it?** History lives in git, so trace it there rather than guessing.

## Trace

1. **Read the code and its comments.** A trap comment may already answer (2).
2. **Blame the lines:** `git blame -w -C -L <start>,<end> -- <file>`. Ignore formatting sweeps (`.git-blame-ignore-revs` is honoured automatically if configured; otherwise pass `--ignore-revs-file`). If a line only moved, follow it with `-C -C` or `git log -L <start>,<end>:<file>`.
3. **Read each distinct commit body:** `git show -s --format=%B <sha>`. Squash-merged PR commits carry the PR body.
4. **Follow references:** `#N` → `gh issue view N` / `gh pr view N` (include comments if the body is thin). For a function's evolution, `git log -S '<identifier>' --oneline -- <path>`.
5. **Check the docs:** `docs/wiki/INDEX.md` and `docs/decisions/` at the nearest doc root, plus any `@see` on the code.
6. **Check the tests** that cover it: a test named after a rule is the rule.

Stop as soon as both questions are answered. Usually that's one or two commits.

## Answer

Short, in this shape:

- **Why:** the reason in a sentence or two, citing the commit (short SHA) / issue / ADR.
- **Before changing:** constraints, tests that guard it, consumers affected. Or "nothing non-obvious".
- **Confidence:** say so if the trail goes cold (e.g. an initial import) and you're inferring.

If the reason turned out to be a trap that isn't marked, offer to add a one-line trap comment or a test named after the rule. If the code turns out to have no reason (dead, vestigial), say so; that's often the most useful answer.
