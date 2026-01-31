# Task: Update State Derivation to Use Promise Markers

## Objective
Change state derivation to look for `<promise>COMPLETE</promise>` and `<promise>FAILED</promise>` markers instead of `## Status: SUCCESS/FAILED`.

## Context
Currently, `src/core/state-derivation.ts` uses `## Status: SUCCESS` markdown heading to determine task status. This interferes with markdown rendering. The new approach uses `<promise>` markers which are already used for output parsing.

## Requirements
- Update `parseOutcomeStatus()` in `src/core/state-derivation.ts`
- Look for `<promise>COMPLETE</promise>` → status: completed
- Look for `<promise>FAILED</promise>` → status: failed
- Marker should be at the end of the file (last occurrence wins)
- Update all related tests

## Implementation Steps
1. Read `src/core/state-derivation.ts`
2. Modify `parseOutcomeStatus()` function:
   - Change regex from `/^## Status: (SUCCESS|FAILED)/m` to `/<promise>(COMPLETE|FAILED)<\/promise>/`
   - Map COMPLETE → 'completed', FAILED → 'failed'
   - Use last occurrence if multiple markers exist
3. Update tests in `tests/unit/state-derivation.test.ts`
4. Update test fixtures if they use old format

## Acceptance Criteria
- [ ] `parseOutcomeStatus()` correctly parses `<promise>COMPLETE</promise>` as completed
- [ ] `parseOutcomeStatus()` correctly parses `<promise>FAILED</promise>` as failed
- [ ] Returns null if no marker found
- [ ] All state-derivation tests pass
- [ ] No regression in project status detection

## Notes
- This is backwards-incompatible with old outcome files
- Existing projects with old format will show as "pending" (acceptable for now)
- The marker format matches what Claude outputs for completion signaling
