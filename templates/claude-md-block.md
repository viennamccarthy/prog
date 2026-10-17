<!-- prog v2 -->
## How this repo works

This repo follows the prog repo system (guide: https://github.com/viennamccarthy/prog). The binding rules, so they hold even without the plugin:

- **One home per question.** Backlog → GitHub issues. In-flight multi-step work → `.plans/<issue>-<slug>.md` (frontmatter `issue`/`branch`/`status`; Goal, attributed Decisions, checkbox Steps). Line-level *why* → commit bodies, reached via blame. How it works now → `docs/wiki/`. Foundation decisions → `docs/decisions/` ADRs. Doc roots and their folders are listed in `README.md`.
- **Resuming:** when the user asks what they were doing (or to pick up / carry on), check the current branch, uncommitted work and `.plans/` first.
- **Multi-step work** (more than one sitting, or several commits): without being asked, make sure an issue exists and write the plan with `status: draft`. The user reads it and approves; then set `status: active` and branch `<issue>-<slug>`. If a plan exists, follow it from the first unchecked step and tick steps as they land. Small single-session changes need no plan. Native plan-mode drafts are scratch and never go in `.plans/`.
- **Closing a plan:** move durable content into docs, ADRs or issues, then delete the plan. Nothing durable links to a plan.
- **Commits:** the body records the why; reference the issue. Non-trivial work lands by squash-merged PR with CI green.
- **Comments:** one-line usage TSDoc on exports where name and type don't say it; otherwise only trap warnings (a constraint a reader might wrongly "fix"). No history, issue numbers or plan names; open questions as `DECIDE(#N):` / `TODO(#N):`.
- **Docs:** wiki notes describe the present, one concept each, ≤150 lines, listed in `INDEX.md`; accepted-but-unbuilt designs sit under `Pending #N` headings. ADRs are `NNNN-slug.md` with a Status line. CLAUDE.md files hold instructions, never status. Markdown is never hard-wrapped. The docs check must pass: `prog check-docs`, or `bunx --bun github:viennamccarthy/prog#v{{version}} check-docs` without the plugin (CI runs the latter).
- Project state belongs in the repo, never only in Claude's private memory.
<!-- /prog -->
