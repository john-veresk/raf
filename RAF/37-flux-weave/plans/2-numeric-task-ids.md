---
effort: medium
---
# Task: Switch Task IDs to Numeric

## Objective
Replace the base36 two-character task ID system with sequential numeric IDs (1, 2, 3, ...) matching the same format as the new project IDs.

## Context
Task IDs are currently 2-character base36 strings (e.g., "01", "0a", "10"). This is confusing because "0a" looks like hex and "10" means 36 in base36. Switching to simple sequential numbers (1-setup-db, 2-create-api, 10-write-tests) is more intuitive. No migration needed — fresh start.

## Dependencies
1

## Requirements
- Plan file format: `{number}-{task-name}.md` (e.g., `1-setup-database.md`, `12-write-tests.md`)
- No zero-padding on the number
- Only digits in the ID portion — no alpha characters
- Task numbering starts at 1 within each project
- The amend flow must find the max existing task number and continue from there

## Implementation Steps

1. **Replace task ID encoding/decoding in `src/utils/paths.ts`:**
   - Replace `encodeTaskId(num)` — now just returns `num.toString()` (no base36, no padding)
   - Replace `decodeTaskId(str)` — now just does `parseInt(str, 10)`
   - Update the regex pattern that extracts task IDs from filenames: change from `^[0-9a-z]{2}-` to `^\d+-`
   - Remove the 1296 (36*36) max limit — numeric IDs have no practical limit

2. **Update plan file parsing in `src/core/state-derivation.ts`:**
   - `parsePlanFiles()` or equivalent — update regex to match `^\d+-` prefix
   - Task ID extraction from filenames
   - Dependency parsing (dependencies reference task IDs like "01, 02" — now "1, 2")

3. **Update the amend flow in `src/commands/plan.ts`:**
   - Where `decodeTaskId()` is called to find max task number — use new numeric decode
   - Where `encodeTaskId()` is called to generate next task number — use new numeric encode
   - Update the amend template that shows existing tasks and next task number

4. **Update commit message rendering:**
   - Task commit format `{prefix}[{projectId}:{taskId}]` — ensure numeric task IDs work (e.g., `RAF[3:5] Setup database`)

5. **Update the planning prompt in `src/prompts/planning.ts`:**
   - The prompt tells Claude to create plan files numbered "01, 02, 03" — update to "1, 2, 3"
   - Update any examples that show base36 task IDs

6. **Update the amend prompt in `src/prompts/amend.ts`:**
   - References to task ID format and next task number

7. **Update frontmatter parsing in `src/utils/frontmatter.ts`** if it references task ID format.

8. **Update tests** that use base36 task IDs.

## Acceptance Criteria
- [ ] Plan files are created as `1-task-name.md`, `2-task-name.md`, etc.
- [ ] `encodeTaskId(5)` returns `"5"` (not `"05"`)
- [ ] `decodeTaskId("12")` returns `12`
- [ ] Amend flow correctly finds max task number and increments
- [ ] Task commit messages show numeric IDs: `RAF[3:2] Task description`
- [ ] Dependency references in plan frontmatter work with numeric IDs
- [ ] All tests pass

## Notes
- This task follows the same pattern as task 01 (numeric project IDs) but is scoped to task IDs within a project.
- The planning prompt instructs Claude on the file naming convention, so it must be updated to tell Claude to use numeric prefixes.
