effort: medium
---
# Task: Sync worktree branch with main before execution

## Objective
Before executing tasks in a worktree, rebase the worktree branch onto the latest main branch to ensure it's up-to-date.

## Dependencies
03

## Context
When using `raf do` in worktree mode, the worktree branch may be behind main (e.g., if other worktree projects were merged into main since this branch was created). Rebasing before execution ensures the branch starts from the latest main, reducing merge conflicts later.

## Requirements
- After `pullMainBranch()` syncs main, rebase the worktree branch onto main
- Only do this in worktree mode in `raf do`
- If rebase has conflicts: abort the rebase, show a warning, and continue execution without sync
- The rebase should happen after worktree project selection but before task execution begins
- Respect the `syncMainBranch` config setting — skip if disabled

## Implementation Steps

1. **Add a `rebaseOntoMain` function to `src/core/worktree.ts`**:
   ```typescript
   export interface RebaseResult {
     success: boolean;
     error?: string;
   }

   export function rebaseOntoMain(mainBranch: string, cwd: string): RebaseResult {
     try {
       execSync(`git rebase ${mainBranch}`, {
         encoding: 'utf-8',
         stdio: 'pipe',
         cwd,
       });
       return { success: true };
     } catch (error) {
       // Abort the failed rebase to restore clean state
       try {
         execSync('git rebase --abort', {
           encoding: 'utf-8',
           stdio: 'pipe',
           cwd,
         });
       } catch {
         // Ignore abort errors
       }
       const msg = error instanceof Error ? error.message : String(error);
       return { success: false, error: msg };
     }
   }
   ```

2. **Edit `src/commands/do.ts`** — Add the rebase step after `pullMainBranch()` in the worktree mode section (after line 251, before task execution). The rebase should run inside the worktree directory:
   ```typescript
   // After pullMainBranch sync and worktree project selection...
   // Rebase worktree branch onto main before execution
   if (getSyncMainBranch() && worktreeCwd) {
     const mainBranch = syncResult?.mainBranch ?? detectMainBranch();
     if (mainBranch) {
       const rebaseResult = rebaseOntoMain(mainBranch, worktreeCwd);
       if (rebaseResult.success) {
         logger.info(`Rebased onto ${mainBranch}`);
       } else {
         logger.warn(`Could not rebase onto ${mainBranch}: ${rebaseResult.error}`);
         logger.warn('Continuing with current branch state.');
       }
     }
   }
   ```
   Note: The exact placement depends on where `worktreeCwd` is set. Find the right location — it should be after the worktree is validated/created and `worktreeCwd` is determined, but before the task execution loop begins.

3. **Determine the main branch name** — The `pullMainBranch()` result includes `mainBranch`. Store it so it can be used for the rebase. If `pullMainBranch()` wasn't called (syncMainBranch disabled), you can detect main branch with the existing `detectMainBranch()` utility from `worktree.ts`.

4. **Add tests** for the new `rebaseOntoMain` function:
   - Successful rebase
   - Rebase with conflicts → aborts and returns failure
   - Verify `git rebase --abort` is called on failure

## Acceptance Criteria
- [ ] Worktree branch is rebased onto main before task execution
- [ ] Conflicts cause rebase abort + warning, execution continues
- [ ] Rebase only happens in worktree mode
- [ ] Respects `syncMainBranch` config setting
- [ ] Main branch name correctly determined from sync result or detection
- [ ] Tests pass

## Notes
- The rebase should use the local main branch ref (which was just synced by `pullMainBranch`)
- If `pullMainBranch` failed (e.g., diverged — now returns `success: false` after task 03), the rebase should still attempt using whatever local main is available
- This runs in the worktree directory (`cwd`), not the main repo
