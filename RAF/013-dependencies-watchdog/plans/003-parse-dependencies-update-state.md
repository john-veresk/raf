# Task: Parse Dependencies and Update State Derivation

## Objective
Add dependency parsing to plan file reading and extend state derivation to include a new `blocked` status.

## Context
Plan files now contain an optional Dependencies section. The state derivation system needs to parse these dependencies and determine when tasks are blocked (when any dependency has failed).

## Dependencies
001

## Requirements
- Parse `## Dependencies` section from plan files
- Extract comma-separated task IDs (e.g., "001, 002" → ["001", "002"])
- Add new `blocked` status to `DerivedTask` type (in addition to pending, completed, failed)
- A task is `blocked` when any of its dependencies have status `failed` or `blocked`
- Add new `<promise>BLOCKED</promise>` marker recognition in outcome parsing
- Update `DerivedTask` interface to include `dependencies: string[]` field
- Update `getNextExecutableTask()` to skip blocked tasks

## Implementation Steps
1. Update `src/types/index.ts`:
   - Add `'blocked'` to TaskStatus union type
   - Add `dependencies: string[]` to DerivedTask interface
2. Create dependency parser in `src/parsers/` or add to existing parser:
   - Function to extract Dependencies section from plan content
   - Parse comma-separated IDs into string array
   - Handle missing section (return empty array)
3. Update `src/core/state-derivation.ts`:
   - Modify `deriveProjectState()` to read dependencies from each plan
   - Add logic to determine blocked status based on dependency states
   - Update `parseOutcomeStatus()` to recognize BLOCKED marker
4. Update `getNextExecutableTask()` to skip blocked tasks (don't return them for execution)

## Acceptance Criteria
- [ ] DerivedTask includes dependencies array
- [ ] TaskStatus includes 'blocked'
- [ ] Dependencies correctly parsed from plan files
- [ ] Tasks with failed/blocked dependencies have status 'blocked'
- [ ] BLOCKED marker recognized in outcome files
- [ ] getNextExecutableTask() skips blocked tasks

## Notes
- Blocked status is derived, not persisted - calculated each time state is derived
- A task becomes blocked when ANY dependency fails (not all)
- Blocked tasks stay blocked until the failed dependency is fixed and re-run
