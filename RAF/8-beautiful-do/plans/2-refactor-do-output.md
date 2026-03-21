# Task: Refactor Do Command Output

## Objective
Update the `do` command to use ultra-minimal, single-line progress display with in-place updates.

## Context
Currently the `do` command outputs verbose logs. The new design uses single-line progress that updates in place, showing only: symbol + task name + timer. When complete, the running line transforms to show the final status.

## Requirements
- Project header: `▶ my-project (5 tasks)` - one line only
- During execution: `● implementing-auth 1:23` (updates in place)
- On completion: Replace with `✓ implementing-auth 2:34`
- On failure: Replace with `✗ implementing-auth 2:34`
- Silent retries: No retry messages, just keep showing `●`
- Final summary: `✓ 5/5 completed in 12:34` (single line)
- Remove verbose output by default (keep for `--verbose` flag)
- No model info in normal mode (only with `--verbose`)

## Implementation Steps
1. Import terminal symbols module
2. Replace project header logging with `formatProjectHeader()`
3. Update task execution loop:
   - Use status line to show `● task-name timer`
   - Update timer every second
   - On complete/fail: clear line, print final `✓`/`✗` line
4. Remove retry logging in normal mode
5. Remove per-task success/error logger calls
6. Update final summary to use `formatSummary()`
7. Keep multi-project summary minimal: `✓ project-name`, `✗ project-name`
8. Ensure `--verbose` still shows detailed output

## Acceptance Criteria
- [ ] Single-line progress updates in place during task execution
- [ ] Timer visible and updating during task run
- [ ] Clean transformation from running to complete/failed
- [ ] No retry noise in normal mode
- [ ] Summary shows single result line
- [ ] `--verbose` flag still provides detailed output
- [ ] All existing tests pass or are updated

## Notes
- Use existing `createStatusLine()` for in-place updates
- Preserve timer accuracy from current implementation
- Multi-project mode should show minimal per-project results
