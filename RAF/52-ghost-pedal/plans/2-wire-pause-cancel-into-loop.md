---
effort: medium
---
# Task: Wire pause and cancel into the execution loop

## Objective
Integrate the `KeyboardController`'s pause and cancel states into the main task execution loop in `do.ts`, so that pressing 'p' pauses between tasks and 'c' stops execution after the current task.

## Context
Task 1 added `isPaused`, `isCancelled`, and `waitForResume()` to `KeyboardController`. Now the `while (task)` loop in `executeSingleProject()` needs to check these states between tasks. Currently the loop (line ~762 of `do.ts`) processes tasks sequentially — we need to insert pause/cancel checks at the transition point between tasks.

## Dependencies
1

## Requirements
- **Pause**: After a task completes (success or failure) and before the next task starts, call `keyboard.waitForResume()`. If paused, execution blocks until the user presses 'p' again. Log a visible message when actually waiting (not just when 'p' is pressed during a task).
- **Cancel**: After a task completes, check `keyboard.isCancelled`. If true, break out of the loop immediately. Remaining tasks stay in their current state (pending/blocked) — they are NOT marked as failed or skipped.
- **Cancel exit code**: When execution ends due to cancel, the function should return with `success: true` so that `process.exit(1)` is NOT called. Override the return value: `success` should be `true` when cancelled (exit 0), regardless of pending tasks. Add a `cancelled: boolean` field to the return object.
- **Summary**: When cancelled, show a summary line like `Cancelled by user. X tasks completed, Y remaining.`
- **Pause message on wait**: When the loop actually pauses (i.e., the task just finished and `isPaused` is true), log `Paused. Press P to resume...` before calling `waitForResume()`. After resume, log `Resumed.`

## Implementation Steps
1. In `executeSingleProject()`, locate the bottom of the `while (task)` loop (around line 1149, after `task = getNextTaskToProcess(state)`).
2. **Before** fetching the next task (or right after re-deriving state at line 1146), add the cancel check:
   ```typescript
   // Check for user-requested cancellation
   if (keyboard.isCancelled) {
     logger.info('Cancelled by user.');
     break;
   }
   ```
3. **After** the cancel check but before continuing the loop with the next task, add the pause check:
   ```typescript
   // Check for user-requested pause
   if (keyboard.isPaused) {
     logger.info('Paused. Press P to resume...');
     await keyboard.waitForResume();
     logger.info('Resumed.');
   }
   ```
4. Update the return type of `executeSingleProject()` to include `cancelled?: boolean`.
5. When the loop exits due to cancel, set `cancelled: true` in the return value and override `success: true`.
6. In `runDoCommand()`, after receiving the result from `executeSingleProject()`, check `result.cancelled`:
   - If cancelled, skip `process.exit(1)` — just return (exit 0).
   - Also skip `pushOnComplete` and post-actions when cancelled (these already won't fire since `result.success` controls them, but the override to `success: true` means we need to explicitly check `cancelled`).
7. Update the summary section: when cancelled, show a cancel-specific summary instead of the normal complete/failed/incomplete messages. Something like:
   ```
   Cancelled — 3/7 tasks completed, 4 remaining
   ```

## Acceptance Criteria
- [ ] Pressing 'p' during a running task shows `[paused]` immediately; after that task finishes, execution pauses with `Paused. Press P to resume...`
- [ ] Pressing 'p' again resumes execution with `Resumed.` message
- [ ] Pressing 'c' during a running task shows `[stopping after current task...]`; after that task finishes, loop exits
- [ ] Cancelled run exits with code 0
- [ ] Cancelled run does NOT trigger pushOnComplete, merge, or PR post-actions
- [ ] Remaining tasks after cancel stay as pending (not marked failed/skipped)
- [ ] Cancel summary shows how many tasks were completed and how many remain
- [ ] Pause/cancel work in both verbose and minimal (non-verbose) modes

## Notes
- The pause check should happen even for blocked tasks — if the user paused during a blocked task's processing, honor it before the next task.
- Be careful with the `success` override for cancel: `pushOnComplete` at line ~431 checks `result.success`, so we need `result.cancelled` to gate that too. Pattern: `if (!worktreeRoot && result.success && !result.cancelled && getPushOnComplete())`.
- Similarly for post-actions at line ~420: `if (result.success && !result.cancelled)` for worktree post-action execution.
- The `waitForResume()` should not interfere with Ctrl+C — if the user presses Ctrl+C while paused, the shutdown handler should still fire normally.
