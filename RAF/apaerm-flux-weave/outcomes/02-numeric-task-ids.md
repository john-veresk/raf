# Outcome: Switch Task IDs to Numeric

## Summary
Replaced the base36 two-character task ID system with sequential numeric IDs (1, 2, 3, ...) matching the project ID format from task 01.

## Key Changes

### Source files modified:
- **`src/utils/paths.ts`** — Rewrote task ID system: `TASK_ID_PATTERN` changed from `[0-9a-z]{2}` to `\d+`. `encodeTaskId()` now returns plain `num.toString()`. `decodeTaskId()` now uses `parseInt(str, 10)` with `\d+` validation. Removed `TASK_ID_WIDTH` constant and 1296 max limit. `extractTaskNameFromPlanFile()` regex updated from `^[0-9a-z]{2}-` to `^\d+-`.
- **`src/core/state-derivation.ts`** — Updated comments from "2-char base36" to "numeric". No logic changes needed (uses `TASK_ID_PATTERN` which was updated).
- **`src/prompts/execution.ts`** — Changed task number encoding from `taskNumber.toString(36).padStart(2, '0')` to `taskNumber.toString()`.
- **`src/prompts/planning.ts`** — Updated all examples from `01-`, `02-` to `1-`, `2-`. Updated dependency format examples from `"01, 02"` to `"1, 2"`. Updated task summary examples.
- **`src/prompts/amend.ts`** — Updated dependency format examples and task numbering references.
- **`src/commands/plan.ts`** — Updated comment from "decode base36" to "numeric".

### Test files updated (7 files):
- `tests/unit/paths.test.ts` — Updated `extractTaskNameFromPlanFile` tests for numeric IDs
- `tests/unit/state-derivation.test.ts` — Updated all plan/outcome filenames and dependency references
- `tests/unit/execution-prompt.test.ts` — Updated commit format expectations and task ID references
- `tests/unit/plan-command.test.ts` — Updated all task IDs, filenames, and amend prompt expectations
- `tests/unit/dependency-integration.test.ts` — Updated all task IDs, dependencies, and filenames
- `tests/unit/config.test.ts` — Updated task ID in renderCommitMessage test
- `tests/unit/planning-prompt.test.ts` — Updated plan file path and numbering expectations

## Acceptance Criteria Verification
- [x] Plan files are created as `1-task-name.md`, `2-task-name.md`, etc.
- [x] `encodeTaskId(5)` returns `"5"` (not `"05"`)
- [x] `decodeTaskId("12")` returns `12`
- [x] Amend flow correctly finds max task number and increments
- [x] Task commit messages show numeric IDs: `RAF[3:2] Task description`
- [x] Dependency references in plan frontmatter work with numeric IDs
- [x] All tests pass (1239/1240 — 1 pre-existing failure in name-generator.test.ts unrelated to this change)

<promise>COMPLETE</promise>
