# Outcome: Fix Dependency Rules in Planning and Amend Prompts

## Summary
Updated both planning and amend prompts to enforce that dependency IDs must be strictly lower than the task's own ID, and updated the Dependencies section format to include outcome file paths for completed tasks. Also updated the dependency parser to handle the new format.

## Key Changes

### `src/prompts/planning.ts`
- Updated Dependencies template example to show outcome file links: `"1 (see outcomes/1-setup-db.md), 3 (see outcomes/3-add-api.md)"`
- Updated `**Dependencies:**` instruction block: added explicit "dependency IDs must be strictly lower than its own ID" rule with concrete invalid example (task 36 CANNOT depend on task 39), and instruction to include outcome file paths inline

### `src/prompts/amend.ts`
- Same Dependencies template update as planning.ts
- Added `**Dependencies:**` instruction block (didn't exist before) with the same rules, plus instruction to use completed task names from the existing tasks list to construct outcome file paths

### `src/core/state-derivation.ts`
- Updated `parseDependencies()` to strip parenthetical notes before matching IDs (`.replace(/\s*\(.*?\)/, '').trim()`), so `"1 (see outcomes/1-foo.md), 3"` correctly parses to `["1", "3"]`

## Acceptance Criteria
- [x] Both `src/prompts/planning.ts` and `src/prompts/amend.ts` include the dependency ID < task ID rule
- [x] Both prompts include a concrete invalid example (task 36 cannot depend on 39)
- [x] Plan template shows the new Dependencies format with outcome file paths
- [x] TypeScript compiles cleanly (`tsc --noEmit`)

<promise>COMPLETE</promise>
