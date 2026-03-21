# Task: Add Running Time Display During Task Execution

## Objective
Show a live timer in the status line during task execution, displaying elapsed time like `⏱ 2m 34s`.

## Context
Currently, there's no visibility into how long a task has been running during the "do" phase. A live timer helps users understand task progress and identify potential hangs or long-running operations.

## Requirements
- Show continuously updating timer during task execution
- Format: `⏱ 2m 34s` or similar human-readable format
- Update frequency: every second
- Display in status line (not as log spam)
- Timer starts when task begins, stops when task completes or fails

## Implementation Steps
1. Create a timer utility in `src/utils/timer.ts` or similar
2. Implement a status line that can be updated in-place (using `\r` or cursor control)
3. In `src/commands/do.ts`, start timer when task execution begins
4. Update the display every second with current elapsed time
5. Stop and clear timer when task completes
6. Format time as: `Xm Ys` for minutes/seconds, `Xh Ym` for hours/minutes
7. Ensure timer doesn't interfere with Claude's output streaming

## Acceptance Criteria
- [ ] Live timer shown during task execution
- [ ] Timer updates every second
- [ ] Format is human-readable (e.g., `⏱ 2m 34s`)
- [ ] Timer stops when task completes or fails
- [ ] Timer doesn't interfere with other output
- [ ] Works correctly with verbose mode
- [ ] All tests pass

## Notes
- Use `setInterval` for timer updates, clear on completion
- Consider using `process.stdout.write('\r...')` for in-place updates
- May need to handle terminal width for proper display
- Timer should be cleared/hidden before final status output
- Consider storing elapsed time in task outcome for summary
