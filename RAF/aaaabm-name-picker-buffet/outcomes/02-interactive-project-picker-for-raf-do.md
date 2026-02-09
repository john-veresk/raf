# Outcome: Interactive Project Picker for `raf do`

## Summary

Implemented an interactive project picker that allows users to run `raf do` without specifying a project name. When no arguments are provided, the command displays a list of pending projects with arrow-key navigation for selection.

## Key Changes

### New Files
- **src/ui/project-picker.ts**: Interactive UI component for selecting pending projects
  - `getPendingProjects()`: Filters projects to only show those with pending/failed tasks
  - `formatProjectChoice()`: Formats project display as "001 fix-auth-bug (2/5 tasks)"
  - `pickPendingProject()`: Shows interactive selection using `@inquirer/prompts`
- **tests/unit/project-picker.test.ts**: Comprehensive tests for the project picker (14 tests)

### Modified Files
- **src/commands/do.ts**: Updated to support optional project argument
  - Changed `<projects...>` to `[projects...]` making the argument optional
  - Added interactive picker flow when no arguments provided
  - Shows "No pending projects found" message when list is empty
  - Handles Ctrl+C gracefully for cancellation

## Features Implemented

1. **Pending project detection**: Scans RAF directory for projects with pending or failed tasks
2. **Task progress display**: Shows completion status like "(2/5 tasks)" for each project
3. **Arrow-key navigation**: Uses `@inquirer/prompts` select for interactive selection
4. **Sorted by project number**: Projects shown oldest first (by number)
5. **Graceful handling**:
   - Empty list shows friendly message
   - Ctrl+C exits cleanly without error

## Acceptance Criteria Met

- [x] Running `raf do` without arguments shows pending projects list
- [x] Projects show number, name, and progress (X/Y tasks)
- [x] User can navigate with arrow keys and select with Enter
- [x] Selected project is executed
- [x] Empty list shows friendly message "No pending projects found"
- [x] Ctrl+C exits gracefully
- [x] All tests pass (591 total)

<promise>COMPLETE</promise>


## Details
- Attempts: 1
- Elapsed time: 3m 25s
- Completed at: 2026-01-31T14:05:20.699Z
