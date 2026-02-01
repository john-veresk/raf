# Outcome: Integrate Commit into Plan Command

## Summary

Integrated the `commitPlanningArtifacts` function (from Task 001) into the plan command to automatically commit planning artifacts (input.md and decisions.md) after successful planning in both regular and amend modes.

## Changes Made

### Files Modified
- **src/commands/plan.ts**: Added import and commit calls in both `runPlanCommand()` and `runAmendCommand()`

## Implementation Details

1. **Import added** at the top of plan.ts:
   ```typescript
   import { commitPlanningArtifacts } from '../core/git.js';
   ```

2. **Integration in `runPlanCommand()`** (line 207-208):
   - Placed after the "Planning complete!" success message
   - Placed before the "Run 'raf do'" info message
   - Inside the `if (planFiles.length > 0)` block (no commit if no plans created)

3. **Integration in `runAmendCommand()`** (line 388-389):
   - Placed after the "Amendment complete!" success message
   - Placed before the "Total tasks" / "Run 'raf do'" info messages
   - Inside the `if (newPlanFiles.length > 0)` block (no commit if no new plans created)

## Acceptance Criteria Verification

- [x] Regular `raf plan` commits input.md and decisions.md after planning
- [x] `raf plan --amend` commits input.md and decisions.md after amendment
- [x] No commit attempted if no plan files were created
- [x] Git warnings displayed but don't interrupt success flow
- [x] TypeScript compiles without errors (verified with `npm run build`)
- [x] All 741 existing tests continue to pass

## Notes

- The `commitPlanningArtifacts` function handles all error cases gracefully (logs warnings, never throws)
- Commit happens automatically without any user flag
- The flow maintains clean logging - git warnings appear but don't overshadow the success message

<promise>COMPLETE</promise>
