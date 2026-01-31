# Task: Remove details and failure history from successful outcomes

## Objective
Remove the `## Details` section from successful outcomes and move failure history to console output instead of outcome files.

## Context
Currently, the `## Details` section (attempts, elapsed time, timestamp) and `## Failure History` section are appended to outcome files. This adds noise to successful outcomes. Instead:
- Successful outcomes should be clean (no metadata)
- Failed outcomes keep `## Details` for debugging
- Failure/retry history should appear in terminal output at the end of `raf do`

## Requirements
- Remove `## Details` section from successful task outcomes
- Remove `## Failure History` section from all outcome files
- Keep `## Details` section for failed task outcomes (with attempts, elapsed time, timestamp, stash name)
- Show retry history in console output for any task that had failures (even if eventually successful)
- Do not modify the `<promise>COMPLETE</promise>` or `<promise>FAILED</promise>` markers

## Implementation Steps
1. Read `src/commands/do.ts` to understand current outcome file generation (lines 595-730)
2. In the success branch (around line 595):
   - Remove the `## Details` section append
   - Remove the `failureHistorySection` insertion into outcome file
3. Collect retry information during task execution:
   - Track which tasks had failures before completing
   - Store the failure history data (task id, attempt numbers, reasons)
4. Add summary output at end of project execution:
   - After the completion summary, show retry history for tasks that had failures
   - Format: "Task X: Attempt 1 failed (reason), Attempt 2 succeeded" or similar
5. Update/add tests:
   - `tests/unit/outcome-content.test.ts`: successful outcomes have no `## Details` or `## Failure History`
   - `tests/unit/do-command.test.ts`: verify retry history appears in console output
6. Run tests to verify changes

## Acceptance Criteria
- [ ] Successful task outcomes do not contain `## Details` section
- [ ] Successful task outcomes do not contain `## Failure History` section
- [ ] Failed task outcomes still contain `## Details` section with all metadata
- [ ] Console output shows retry history for any task that had failures before completing
- [ ] All existing tests pass
- [ ] New/updated tests verify the behavior change

## Notes
- The `formatFailureHistory` function may need to be repurposed for console output
- Consider both verbose and minimal output modes for the retry summary
- Lines to modify are approximately 606-730 in do.ts
