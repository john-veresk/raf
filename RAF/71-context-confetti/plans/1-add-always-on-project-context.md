---
effort: high
---
# Task: Add Always-On Project Context

## Objective
Replace `decisions.md` with a generated `context.md` plus per-task decision capture in plans and outcomes, then use that shared context in planning amendments, execution, and downstream project summaries without duplicating project-level guidance.

## Requirements
- Add a dedicated project-context builder module instead of spreading summary logic across commands.
- Remove `decisions.md` as a RAF project artifact and stop creating, reading, staging, documenting, or prompting for it.
- Generate `${projectPath}/context.md` with one deterministic, bounded markdown structure:
  - `# Project Context`
  - `## Goal`
  - `## Key Decisions`
  - `## Current State`
  - `## Completed Work`
  - `## Pending Work`
  - `## Source Files`
- Build `context.md` from the surviving project artifacts and state machinery:
  - read `input.md` for the goal summary
  - read task plans for planned decisions
  - read completed outcomes for execution-stage decision updates
  - derive task status from `deriveProjectState(...)` rather than reparsing plan/outcome markdown ad hoc
  - summarize completed outcomes, preferring each outcome file’s `## Summary` section and otherwise falling back to the first meaningful bounded content
  - summarize important decisions from both plan files and outcome files into `## Key Decisions`
- Reuse the existing outcome-summary behavior from `src/prompts/execution.ts` by extracting shared logic rather than maintaining two divergent summary implementations.
- Add an explicit project path helper for `context.md` if needed so commands and tests use one canonical location.
- Update the task-plan schema so each task can store its final planning decisions directly in the plan file instead of relying on a project-wide `decisions.md`.
- Update planning and amend prompts so interview answers and reconciled architectural choices are written into the relevant task plan files and summarized into `context.md`, not appended to a separate decisions artifact.
- Refresh `context.md` in `raf plan` after plan files are created and before planning artifacts are committed.
- Refresh `context.md` in `raf plan --amend` after the amendment session finishes and before planning artifacts are committed, even when no new plan file was added.
- Refresh `context.md` in `raf do` immediately after every outcome write path:
  - successful task outcomes
  - failed task outcomes
  - RAF-generated blocked outcomes
  - any fallback outcome write that RAF performs after an LLM run
- Update execution outcome expectations so decision changes made during execution are recorded in the outcome file in a deterministic place and can be summarized into `context.md`.
- Keep execution commits clean when `raf do` updates `context.md`:
  - execution prompt commit instructions must stage `context.md`
  - any execution-side commit validation or assumptions must still succeed with `context.md` updated alongside the plan and outcome files
- Update `src/prompts/execution.ts` to inline `context.md` near the top of the prompt and keep only task-specific file references outside it:
  - current plan path
  - current outcome file path
  - previous outcome file path on retry
- Keep dependency context in the execution prompt, but do not re-list generic project file paths there once `context.md` already covers them.
- Update `src/prompts/amend.ts` to inline `context.md` while preserving the existing protected/modifiable task listing and amendment rules.
- Remove or compress duplicated project-level file-location guidance from amend and execution prompts when that information is already present in `context.md`.
- `## Source Files` in `context.md` must list shared project references exactly once and treat them as the canonical project-level references:
  - `input.md`
  - `plans/`
  - `outcomes/`
  - a deterministic, bounded set of recent outcome file references when they add value
- `## Completed Work` must list compact entries for completed tasks that include task ID, task name, and outcome summary.
- `## Key Decisions` in `context.md` must summarize important decisions from:
  - plan-time decisions recorded in each task plan
  - execution-time decisions or deviations recorded in outcome files
  - without restating the same decision multiple times
- Keep the current task plan as the primary task contract; `context.md` is shared context, not a replacement for plan-file requirements.
- Update any downstream consumers that currently depend on `decisions.md` to use `context.md` and plan/outcome-derived decisions instead, including PR body generation and worktree conflict-resolution prompts.
- Update README documentation for the new always-generated `context.md` artifact and how RAF uses it during planning and execution.
- Add or update tests covering:
  - context generation from input, plan decisions, derived state, and outcomes
  - source-file references appearing once
  - preference for outcome `## Summary` sections
  - summarization of plan decisions and execution-time decision updates
  - bounded compact output with no duplicated sections
  - project creation and planning/amend flows with no `decisions.md`
  - plan/amend refresh plus planning-artifact commits that include `context.md` and plan files, but not `decisions.md`
  - execution prompt inclusion of `context.md` while preserving plan/outcome/retry/dependency context
  - `raf do` refreshing `context.md` between tasks so task N+1 sees updated project-wide progress

## Acceptance Criteria
- [ ] RAF project creation, planning prompts, commit flows, and docs no longer rely on `decisions.md`.
- [ ] A new shared context builder generates `${projectPath}/context.md` with the required section order and deterministic bounded content.
- [ ] The builder uses existing state derivation for task status and shared outcome summarization logic instead of introducing a second independent summarizer.
- [ ] Task plans become the source of record for planning-time decisions, and outcomes become the source of record for execution-time decision changes or deviations.
- [ ] `raf plan` and `raf plan --amend` refresh `context.md` before `commitPlanningArtifacts(...)`, and planning-artifact commits include the generated file without staging `decisions.md`.
- [ ] `raf do` refreshes `context.md` after every RAF-managed outcome write path, and successful task execution does not leave `context.md` as an unstaged dirty file.
- [ ] Execution prompts inline `context.md`, still include current plan/outcome paths plus retry/dependency context, and stop redundantly repeating shared project file references outside `context.md`.
- [ ] Amend prompts inline `context.md`, keep the protected/modifiable task lists, and avoid duplicating shared project file-location guidance already covered by `context.md`.
- [ ] PR body generation, worktree conflict prompts, and other project-context consumers derive decisions from `context.md` and plan/outcome content instead of `decisions.md`.
- [ ] Unit/integration tests cover context generation, removal of `decisions.md`, planning-artifact commits, prompt composition, and do-task progression with refreshed context.
- [ ] README documents the generated `context.md` artifact and its role in RAF planning/execution flows.

## Context
There is no existing `context.md` artifact in the current codebase. Today RAF creates `decisions.md` during project creation, planning prompts direct interview answers into it, planning-artifact commits always stage it, PR generation reads it, worktree conflict-resolution prompts reference it, and README plus tests document it as a core artifact. At the same time, `raf do` reads prior outcomes for prompt context but never writes or refreshes a shared project summary. The only reusable outcome summarization logic currently lives inside `src/prompts/execution.ts` as `summarizeOutcome(...)`, so this feature is both a new context-builder project and a storage-model migration away from `decisions.md`.

## Implementation Steps
1. Settle the shared boundary first.
   Define a project-context module, plus any minimal helper exports it needs, so commands, prompt builders, PR generation, and any other project-context consumers share one source of truth for `context.md` content and one shared summarizer for outcomes and decisions.
2. Implement deterministic context rendering.
   Read `input.md`, task plan files, and outcome files; derive project state via `deriveProjectState(...)`; extract planning decisions from plans plus execution-stage decision updates from outcomes; then render the required sections with explicit size limits and stable ordering.
3. Wire planning flows before commit.
   Update project creation and `src/commands/plan.ts` so RAF stops creating `decisions.md`, planning/amend prompts stop routing answers there, new-plan and amend flows refresh `context.md` after the interactive session completes and before `commitPlanningArtifacts(...)` runs, and planning-artifact commits stage `input.md`, `context.md`, and plan files in both main-repo and worktree modes.
4. Wire execution refreshes around outcome writes.
   Update `src/commands/do.ts` so every successful, failed, blocked, or fallback outcome write is immediately followed by a `context.md` refresh before the next task is selected, and execution prompts require recording any material decision change in the outcome file.
5. Slim prompt composition around `context.md`.
   Update `src/prompts/planning.ts`, `src/prompts/shared.ts`, `src/prompts/execution.ts`, and `src/prompts/amend.ts` so decisions are captured in plans/outcomes, `context.md` is inlined where appropriate, generic project references move into that file, and only task-specific paths plus dependency/retry/protected-task context remain outside it.
6. Close the lifecycle gap in execution commits.
   Update execution prompt commit instructions, and any affected tests or assumptions, so commits that follow a successful task include `context.md` and do not leave the worktree dirty.
7. Refresh documentation and regression coverage.
   Add focused unit tests for the builder, update existing prompt, planning-commit, PR-context, project-creation, and worktree tests, add a do-progression test for cross-task context refresh, and document the new artifact model in `README.md`.

## Files to Modify
- `src/commands/plan.ts`
- `src/commands/do.ts`
- `src/prompts/planning.ts`
- `src/prompts/shared.ts`
- `src/prompts/execution.ts`
- `src/prompts/amend.ts`
- `src/core/git.ts`
- `src/core/project-manager.ts`
- `src/core/pull-request.ts`
- `src/core/worktree.ts`
- `src/core/state-derivation.ts` only if the builder needs an additional exported helper from existing state machinery
- `src/utils/paths.ts`
- `README.md`
- New shared context module and its tests, likely under `src/core/` and `tests/unit/`
- Existing prompt/commit/do tests such as `tests/unit/planning-prompt.test.ts`, `tests/unit/execution-prompt.test.ts`, `tests/unit/amend-prompt.test.ts`, `tests/unit/commit-planning-artifacts*.test.ts`, `tests/unit/project-manager.test.ts`, `tests/unit/pull-request.test.ts`, and the relevant `do` command test file

## Risks & Mitigations
- `raf do` currently writes outcomes but does not account for a second generated artifact. If `context.md` is refreshed without being staged on success, RAF will leave a dirty worktree after each completed task. Mitigation: treat `context.md` as part of the execution-side commit contract whenever RAF refreshes it after outcome writes.
- `decisions.md` is referenced across creation, prompts, commit flows, PR summaries, worktree prompts, README, and tests. Removing it is a schema migration, not a local prompt tweak. Mitigation: trace and update every consumer in one pass so no code path still expects the file.
- Outcome summarization currently exists only inside `src/prompts/execution.ts`. Copying that logic into a builder would create immediate drift between dependency summaries and `context.md`. Mitigation: extract one shared summarizer and update both callers.
- Decision capture now spans plan files and outcome files. If the schema is vague, planning and execution will record decisions inconsistently and `context.md` summaries will become noisy. Mitigation: define explicit sections or conventions for decision capture in plans and outcomes, then teach prompts and tests to enforce them.
- Prompt tests currently assert concrete strings for file references. Moving shared references into `context.md` and deleting `decisions.md` will break brittle expectations unless they are rewritten around the new contract. Mitigation: update tests to assert presence of required task-specific paths and absence of redundant project-level path repetition outside the inlined context block.

## Notes
- Keep `context.md` replaceable and machine-generated. Do not treat it as user-authored input or a place to preserve manual edits.
- Preserve the current amend protected/modifiable task rules exactly; `context.md` adds shared context but does not relax mutation boundaries.
- Do not expand this task into extra plan files unless exploration during implementation reveals a hard architectural split that cannot be executed safely in one pass.
