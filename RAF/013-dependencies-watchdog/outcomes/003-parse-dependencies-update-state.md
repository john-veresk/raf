# Outcome: Parse Dependencies and Update State Derivation

## Summary

Implemented dependency parsing from plan files and extended the state derivation system to support a new `blocked` status. Tasks are now automatically blocked when any of their dependencies have failed or are blocked (transitive blocking).

## Key Changes

### 1. Updated Types (`src/core/state-derivation.ts`)

- **DerivedTaskStatus**: Added `'blocked'` to the union type (`'pending' | 'completed' | 'failed' | 'blocked'`)
- **DerivedTask interface**: Added `dependencies: string[]` field to track task dependencies
- **DerivedStats interface**: Added `blocked: number` field for statistics

### 2. New Dependency Parser (`parseDependencies()`)

Created function to extract dependencies from plan file content:
- Looks for `## Dependencies` section followed by a line of comma-separated task IDs
- Validates task IDs (must be 2-3 digit numbers)
- Returns empty array if no Dependencies section exists

### 3. Updated `parseOutcomeStatus()`

- Extended regex to recognize `<promise>BLOCKED</promise>` marker
- Uses switch statement for cleaner handling of COMPLETE/FAILED/BLOCKED

### 4. Updated `deriveProjectState()`

- **First pass**: Reads plan files to extract dependencies along with outcome statuses
- **Second pass**: Derives blocked status using iterative algorithm for transitive blocking
  - A task is blocked if ANY of its dependencies are failed or blocked
  - Uses `while` loop to handle chains (e.g., A fails → B blocked → C blocked)

### 5. Updated `getDerivedStats()`

- Added `blocked: 0` initialization
- Added case for `'blocked'` status in the switch statement

### 6. Updated `getNextExecutableTask()`

- Updated documentation to clarify that blocked tasks are skipped
- No code change needed - blocked tasks already excluded since they don't match 'pending' or 'failed'

## Files Modified

- `src/core/state-derivation.ts` - Main implementation
- `tests/unit/state-derivation.test.ts` - Added 21 new tests, updated existing tests

## New Tests Added

- `parseDependencies`: 7 tests (single/multiple dependencies, whitespace handling, invalid IDs, empty sections)
- `parseOutcomeStatus`: 2 tests for BLOCKED marker
- `deriveProjectState`: 6 tests for dependency parsing and blocked status derivation
- `getNextPendingTask`: 1 test for skipping blocked tasks
- `getNextExecutableTask`: 2 tests for blocked task handling
- `getDerivedStats`: 1 test for blocked count
- `isProjectComplete`: 1 test for blocked tasks
- `hasProjectFailed`: 1 test for blocked vs failed distinction

## Acceptance Criteria Verification

- [x] DerivedTask includes dependencies array
- [x] TaskStatus includes 'blocked'
- [x] Dependencies correctly parsed from plan files
- [x] Tasks with failed/blocked dependencies have status 'blocked'
- [x] BLOCKED marker recognized in outcome files
- [x] getNextExecutableTask() skips blocked tasks

## Notes

- Blocked status is derived, not persisted - calculated each time state is derived
- Transitive blocking is handled through iterative algorithm
- All 659 tests pass

<promise>COMPLETE</promise>
