# Outcome: Update All Pattern Matching and Resolution for 6-Char IDs

## Summary

Updated all remaining project ID patterns across the codebase to use the new 6-character base36 format. Task 001 had already updated `paths.ts` and `state-derivation.ts`; this task updated the remaining callers.

## Key Changes

### `src/utils/validation.ts`
- Rewrote `validateProjectExists()`: replaced dual regex patterns (`/^\d{2,3}-/` and `/^[a-z][0-9a-z]{2}-/`) with single 6-char base36 pattern `/^[0-9a-z]{6}-(.+)$/i`

### `src/commands/status.ts`
- Updated project number display in `listAllProjects()`: replaced `String(project.number).padStart(3, '0')` with `formatProjectNumber(project.number)` to show base36 IDs
- Added `formatProjectNumber` import from paths.ts
- Updated CLI argument help text to show new format examples (`00j3k1` instead of `001`)

### `src/commands/do.ts`
- Updated CLI argument help text to show new format examples (`00j3k1` instead of `001`)

## Verification

- TypeScript compiles with no errors (`npm run lint` passes)
- All remaining `\d{2,3}` patterns in source code are for task-level IDs (3-digit like `001`), not project IDs — confirmed correct
- No old numeric-only or 3-char base36 project patterns remain in source code
- Test failures exist but are expected — test files still use old-format fixtures (e.g., `001-first`) and will be updated in Task 003

## Notes
- The `paths.ts`, `state-derivation.ts`, and `project-picker.ts` files were already updated by Task 001
- Task-level patterns (`\d{2,3}`) in `state-derivation.ts`, `project-manager.ts`, `plan.ts`, and `execution.ts` are intentionally unchanged — task numbering within a project remains 3-digit
- The `project-manager.ts:readOutcomes()` uses `\d{2,3}` for task file matching, which is correct

<promise>COMPLETE</promise>
