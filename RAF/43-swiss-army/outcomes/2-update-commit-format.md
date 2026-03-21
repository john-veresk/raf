# Outcome: Update Commit Message Format

## Summary

Changed commit messages to use project name (from folder) instead of numeric project ID, and added auto-generated descriptions for Plan and Amend commits.

## Changes Made

- **`src/types/config.ts`**: Updated DEFAULT_CONFIG commit format templates from `{projectId}` to `{projectName}`, and changed plan/amend templates to use `{description}` for auto-generated summaries
- **`src/core/git.ts`**: Added `extractPlanDescription()` (reads first line of input.md) and `extractAmendDescription()` (generates description from plan file names). Updated `commitPlanningArtifacts()` to pass `projectName` for both `{projectName}` and `{projectId}` (backwards compat), plus auto-generated `{description}`
- **`src/prompts/execution.ts`**: Updated `getExecutionPrompt()` to extract project name from path and pass it as both `projectName` and `projectId` variables
- **`src/prompts/config-docs.md`**: Updated template variable documentation and examples to reflect new format
- **Tests**: Updated all commit format assertions in `commit-planning-artifacts.test.ts`, `commit-planning-artifacts-worktree.test.ts`, `config.test.ts`, and `execution-prompt.test.ts`

## New Commit Format Examples

- Task: `RAF[swiss-army:1] Fix auth validation`
- Plan: `RAF[swiss-army] Plan: update commit message format...`
- Amend: `RAF[swiss-army] Amend: fix-bug, add-tests`

## Acceptance Criteria Status

- [x] Task commits use project name: `RAF[swiss-army:01] Description`
- [x] Plan commits include auto-generated summary: `RAF[swiss-army] Plan: summary from input.md`
- [x] Amend commits include description: `RAF[swiss-army] Amend: task-names or "updated plans"`
- [x] Commit format templates are configurable via `commitFormat` in config
- [x] `{projectName}` placeholder is documented and works in templates
- [x] Old `{projectId}` placeholder still works for backwards compatibility (resolves to projectName)
- [x] All existing tests pass (1227 pass, 2 pre-existing failures unrelated to this change)

<promise>COMPLETE</promise>
