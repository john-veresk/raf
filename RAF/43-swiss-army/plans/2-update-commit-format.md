---
effort: medium
---
# Task: Update Commit Message Format

## Objective
Change commit messages to use project name (from folder) instead of project ID, and add auto-generated descriptions for Plan and Amend commits.

## Context
Currently commits use numeric project IDs like `RAF[005:01]`. The new format should use the project folder name (kebab-case, without number prefix) and provide meaningful descriptions for plan/amend commits summarized from the project's input.md.

## Dependencies
1

## Requirements
- Extract project name from folder: `43-swiss-army` → `swiss-army` (drop numeric prefix, keep kebab-case)
- Task commits: `RAF[swiss-army:01] Description here`
- Plan commits: `RAF[swiss-army] Plan: <summary from input.md>` — a short project summary
- Amend commits: `RAF[swiss-army] Amend: <description of what was amended>`
- Update commit format templates in DEFAULT_CONFIG to use `{projectName}` placeholder
- Make commit format templates configurable in raf.config.json (they already partially are via `commitFormat`)
- Auto-generate plan description by summarizing plan task names or input.md content
- Auto-generate amend description from what changed (e.g., amended task names)

## Implementation Steps
1. Read `src/types/config.ts` — update DEFAULT_CONFIG `commitFormat` templates to use `{projectName}` instead of `{projectId}`
2. Read `src/utils/config.ts` — update `renderCommitMessage()` to populate `{projectName}` variable
3. Add a utility to extract project name from folder path: strip numeric prefix and dash (e.g., `43-swiss-army` → `swiss-army`)
4. Read `src/core/git.ts` — update `commitPlanningArtifacts()` and any other commit functions to pass `projectName`
5. Read `src/prompts/execution.ts` — update the execution prompt's commit message instructions to use new format
6. For Plan commits: generate description by summarizing plan file names or reading input.md first few lines
7. For Amend commits: generate description from the amended plan files or changes made
8. Update config-docs.md to document the new commit format template variables

## Acceptance Criteria
- [ ] Task commits use project name: `RAF[swiss-army:01] Description`
- [ ] Plan commits include auto-generated summary: `RAF[swiss-army] Plan: summary here`
- [ ] Amend commits include description: `RAF[swiss-army] Amend: what changed`
- [ ] Commit format templates are configurable via `commitFormat` in config
- [ ] `{projectName}` placeholder is documented and works in templates
- [ ] Old `{projectId}` placeholder still works for backwards compatibility (resolves to same as projectName)

## Notes
- `renderCommitMessage()` in `src/utils/config.ts` (line 624) handles template variable substitution via regex `/\{(\w+)\}/g`
- Plan description should be concise — one short sentence summarizing the project scope
- For amend, the description could list which tasks were amended
