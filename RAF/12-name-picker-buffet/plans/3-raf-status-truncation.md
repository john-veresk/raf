# Task: Enhanced `raf status` with Last 10 Projects

## Objective
Modify `raf status` to show only the last 10 projects with a "... and N more" indicator for older projects.

## Context
As RAF accumulates more projects, the status list becomes unwieldy. Showing only recent projects with a truncation indicator keeps the output manageable while indicating more history exists.

## Requirements
- Show last 10 projects by default (most recent at bottom)
- Display "... and N more projects" at the top when list is truncated
- Maintain existing project display format (number, name, progress, status)
- Sort by project number (ascending) within the displayed 10

## Implementation Steps
1. Update `src/commands/status.ts`:
   - In `listAllProjects()` function, check total project count
   - If > 10 projects, slice to last 10
   - Add "... and N more projects" line at the top of output when truncated
   - Keep existing sorting (by project number ascending)
2. Add constant for max displayed projects (10) for easy adjustment
3. Update any existing tests that check status output format
4. Add new test case for truncation behavior

## Acceptance Criteria
- [ ] `raf status` shows max 10 projects
- [ ] When > 10 projects exist, shows "... and N more projects" at top
- [ ] Projects are sorted by number (ascending) with newest at bottom
- [ ] When ≤ 10 projects, no truncation indicator shown
- [ ] Individual project status (`raf status <id>`) unchanged
- [ ] All tests pass

## Notes
- The truncation indicator should be visually distinct (maybe dimmed or prefixed with ...)
- Consider adding a `--all` flag in a future task to show all projects
- This is a simple change - focus on clean implementation and tests
