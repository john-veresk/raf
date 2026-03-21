# Task 003 - Completed

## Summary
All tests pass and build succeeds.
## Summary
Task 003 has been completed successfully. Here's what was implemented:
### Changes Made:
1. **`src/core/git.ts:320-341`** - Added `stashChanges(name: string)` function that:
   - Checks if we're in a git repository
   - Checks if there are uncommitted changes
   - Stashes changes with `git stash push -m "{name}"`
   - Returns `true` on success, `false` otherwise
2. **`src/utils/paths.ts:71-75`** - Added `extractProjectNumber(projectPath: string)` function to extract the project number from a project path (e.g., `/RAF/001-my-project` → `"001"`)
3. **`src/commands/do.ts:196-205`** - Modified failure handling to stash uncommitted changes when a task completely fails:
   - Checks for uncommitted changes before stashing
   - Creates stash name in format `raf-{projectNum}-task-{taskId}-failed`
   - Logs the stash name to inform the user
   - Includes stash name in failure outcome file
4. **Tests added:**
   - `tests/unit/git-stash.test.ts` - 6 tests for `stashChanges` function
   - `tests/unit/paths.test.ts` - 5 tests for `extractProjectNumber` function
### Acceptance Criteria Met:
- ✅ Changes are stashed when task fails completely (after all retries)
- ✅ Changes are NOT stashed during retry attempts  
- ✅ Stash name follows format: `raf-001-task-3-failed`
- ✅ User sees log message with stash name
- ✅ No stash created if no uncommitted changes exist
- ✅ All existing tests pass (125 tests total)
<promise>COMPLETE</promise>

## Details
- Attempts: 1
- Completed at: 2026-01-30T16:07:32.524Z

