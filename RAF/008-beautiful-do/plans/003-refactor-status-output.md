# Task: Refactor Status Command Output

## Objective
Update the `status` command to use compact, minimal output with progress indicators.

## Context
The current status command shows verbose task lists. The new design shows only project-level info with a compact progress bar.

## Requirements
- List format: `001 my-project ✓✓●○○ (2/5)`
- Progress bar uses symbols: ✓ (done), ✗ (failed), ● (running/active), ○ (pending)
- No task-level detail in project list
- Single project view can keep more detail (optional refinement)
- Keep `--json` output unchanged for programmatic use

## Implementation Steps
1. Import terminal symbols module
2. Update `listAllProjects()`:
   - Format each project with `formatProgressBar()`
   - Show project number, name, progress bar, counts
3. Simplify single project view:
   - Header: `▶ project-name`
   - Progress bar with counts
   - Remove verbose task list
4. Keep `--json` flag working as-is
5. Remove extra newlines and "Use 'raf status...'" hint

## Acceptance Criteria
- [ ] Project list shows compact format with progress indicators
- [ ] Progress bar correctly reflects task statuses
- [ ] No task-level detail in list view
- [ ] `--json` output unchanged
- [ ] Clean, minimal output without extra hints

## Notes
- Consider alignment if project names vary significantly in length
- The status command has no "running" state derived - use ● for projects with some but not all tasks done
