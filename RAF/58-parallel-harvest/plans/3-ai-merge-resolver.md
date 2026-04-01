---
effort: high
---
# Task: AI-Powered Merge Conflict Resolution

## Objective
When git merge fails with conflicts during the worktree merge flow, invoke a Claude/Codex harness to automatically resolve conflicts and create a RAF-formatted merge commit.

## Context
Currently `mergeWorktreeBranch()` in `src/core/worktree.ts:203-244` aborts on merge conflicts and tells the user to merge manually. This task adds an AI-powered fallback: when `git merge` produces conflicts, RAF invokes a harness (non-interactively) with instructions to resolve every conflict, stage the resolution, and commit. A new `merge` key in `config.models` controls which model/harness is used (default: claude opus).

## Dependencies
1 (see outcomes/1-multi-select-picker.md), 2 (see outcomes/2-multi-project-execution.md)

## Requirements
- Add `merge` key to `ModelsConfig` interface and `DEFAULT_CONFIG.models` (default: `{ model: 'opus', harness: 'claude' }`)
- Add `ModelScenario` union member `'merge'`
- Add `'merge'` commit format template to `CommitFormatConfig` and `DEFAULT_CONFIG.commitFormat`
- Add `CommitFormatType` union member `'merge'`
- Change the worktree merge flow order: attempt merge **before** removing worktree directory
- When `git merge` fails with conflicts (instead of aborting), invoke the configured merge harness non-interactively to resolve conflicts, stage, and commit
- If AI resolution also fails, abort the merge (`git merge --abort`) and warn user
- The merge commit message must use RAF prefix format: e.g. `RAF[project-name] Merge: branch-name into target-branch`

## Implementation Steps

### 1. Extend config types (`src/types/config.ts`)
- Add `merge` to `ModelScenario` type union: `'plan' | 'execute' | ... | 'merge'`
- Add `merge: ModelEntry` to `ModelsConfig` interface
- Add `merge: string` to `CommitFormatConfig` interface
- Add `'merge'` to `CommitFormatType` type union

### 2. Update DEFAULT_CONFIG (`src/types/config.ts`)
- Add to `models`: `merge: { model: 'opus', harness: 'claude' }`
- Add to `commitFormat`: `merge: '{prefix}[{projectName}] Merge: {branchName} into {targetBranch}'`

### 3. Update config schema and validation (`src/types/config.ts` and `src/utils/config.ts`)
- Add `merge` to `buildConfigSchema`'s `models` object (line ~120) so `fillModelEntry` is called for it
- Ensure `getModel('merge')` works — no code change needed since `getModel` indexes `config.models[scenario]`
- Add `'merge'` to `VALID_COMMIT_FORMAT_KEYS` set (if such a set exists for validation)

### 4. Create AI merge resolver function (`src/core/worktree.ts`)
Add a new async function `resolveConflictsWithAI`:

```typescript
export async function resolveConflictsWithAI(
  branch: string,
  targetBranch: string,
  projectName: string,
  projectPath: string,
): Promise<{ success: boolean; error?: string }> {
  // 1. Get the merge model config via getModel('merge')
  // 2. Create a runner via createRunner({ model, harness, ... })
  // 3. Build a system prompt instructing the AI to:
  //    - Read the RAF project context for understanding: plans/ dir, decisions.md, outcomes/ dir
  //      at projectPath — these explain the intent behind changes made on the branch
  //    - Review git log {targetBranch}..{branch} to see what commits were made
  //    - Inspect all conflicted files (git diff --name-only --diff-filter=U)
  //    - For each conflicted file, read the file, understand both sides of the conflict
  //    - Resolve each conflict marker intelligently, preserving intent from both sides
  //    - Stage resolved files with git add
  //    - Commit with the RAF merge commit message using renderCommitMessage + getCommitFormat('merge')
  // 4. Run non-interactively: runner.run(prompt, { cwd: process.cwd(), timeout })
  // 5. Verify the merge was committed (check git status for clean state, HEAD changed)
  // 6. Return success/failure
}
```

The system prompt should include:
- The branch being merged and the target branch
- Instruction to read the RAF project folder for context about what happened on the branch: plans (`{projectPath}/plans/`), decisions (`{projectPath}/decisions.md`), and outcomes (`{projectPath}/outcomes/`) — these explain the intent behind the changes made after the branch split, so the AI can make informed conflict resolution choices
- Instruction to run `git diff --name-only --diff-filter=U` to find conflicted files
- Instruction to review `git log {targetBranch}..{branch}` to understand what commits were made on the feature branch
- For each file, resolve all `<<<<<<<`, `=======`, `>>>>>>>` markers
- The exact commit message to use (pre-rendered from the merge commit format template)
- Instruction to `git add` each resolved file and then `git commit -m "<message>"`
- Emphasis: resolve ALL conflicts, do not leave any conflict markers

### 5. Update `mergeWorktreeBranch` (`src/core/worktree.ts`)
Change the function signature to async and add AI fallback:

```typescript
export async function mergeWorktreeBranch(
  branch: string,
  originalBranch: string,
  projectName: string,
): Promise<WorktreeMergeResult> {
  // ... existing checkout + ff-merge + regular merge logic ...

  // On conflict (instead of aborting):
  logger.info('Merge conflicts detected. Invoking AI to resolve...');
  const aiResult = await resolveConflictsWithAI(branch, originalBranch, projectName, projectPath);

  if (aiResult.success) {
    return { success: true, merged: true, fastForward: false };
  }

  // AI failed — abort merge and return error
  try {
    execSync('git merge --abort', { encoding: 'utf-8', stdio: 'pipe' });
  } catch {
    logger.warn('Failed to abort merge - repo may be in an inconsistent state');
  }

  return {
    success: false,
    merged: false,
    fastForward: false,
    error: `AI merge resolution failed for "${branch}" into "${originalBranch}". ${aiResult.error ?? 'Please merge manually.'}`,
  };
}
```

### 6. Update `executePostAction` merge case (`src/commands/do.ts:494-531`)
Reorder the merge flow — attempt merge **before** worktree cleanup:

```typescript
case 'merge': {
  if (!originalBranch) {
    logger.warn('Could not determine original branch for merge.');
    // Still clean up worktree
    removeWorktree(worktreeRoot);
    return;
  }

  logger.newline();
  logger.info(`Merging branch "${worktreeBranch}" into "${originalBranch}"...`);

  // Merge FIRST (needs branch to exist; worktree dir not needed for merge)
  const mergeResult = await mergeWorktreeBranch(worktreeBranch, originalBranch, projectName);

  // Clean up worktree AFTER merge (regardless of outcome)
  const cleanupResult = removeWorktree(worktreeRoot);
  if (cleanupResult.success) {
    logger.info(`Cleaned up worktree: ${worktreeRoot}`);
  } else {
    logger.warn(`Could not clean up worktree: ${cleanupResult.error}`);
  }

  if (mergeResult.success) {
    const mergeType = mergeResult.fastForward ? 'fast-forward' : 'merge commit';
    logger.success(`Merged "${worktreeBranch}" into "${originalBranch}" (${mergeType})`);
    // ... existing push logic ...
  } else {
    logger.warn(`Could not auto-merge: ${mergeResult.error}`);
    logger.warn(`You can merge manually: git merge ${worktreeBranch}`);
  }
  break;
}
```

Note: The `projectName` needs to be derived from `projectPath` — use `extractProjectName(projectPath)` which is already available in the codebase.

### 7. Update `executePostAction` signature
Add `projectPath` parameter (already passed) — ensure `projectName` is extracted inside the merge case using `extractProjectName(projectPath)`.

### 8. Update all callers of `mergeWorktreeBranch`
Since the function is now async, update the call in `executePostAction` to use `await`. The function already uses `await` for other async operations so this is straightforward.

### 9. Update config documentation (`src/prompts/config-docs.md`)
Add `models.merge` to the config documentation so `raf config` knows about it.

## Acceptance Criteria
- [ ] `models.merge` exists in DEFAULT_CONFIG with `{ model: 'opus', harness: 'claude' }`
- [ ] `ModelScenario` type includes `'merge'`
- [ ] `commitFormat.merge` template exists: `'{prefix}[{projectName}] Merge: {branchName} into {targetBranch}'`
- [ ] When git merge has conflicts, AI is invoked non-interactively to resolve them
- [ ] AI receives a clear prompt with conflicted file list, branch names, and exact commit message
- [ ] On successful AI resolution, merge completes with RAF-formatted commit message
- [ ] On AI failure, merge is aborted (`git merge --abort`) and user is warned
- [ ] Worktree cleanup happens AFTER merge attempt (not before)
- [ ] `raf config set models.merge.model sonnet` works to override the merge model
- [ ] Existing fast-forward and clean merges still work without invoking AI

## Notes
- The runner's `run()` method is used (not `runInteractive`) since this is non-interactive
- The system prompt must be very explicit about the commit message format — the AI should not improvise
- The merge happens in the main repo directory (not the worktree), so `cwd` should be `process.cwd()` or the repo root
- Consider using a generous timeout for conflict resolution (at least the configured `timeout` value)
- The `WorktreeMergeResult` type may need no changes — `success: true, merged: true, fastForward: false` covers AI-resolved merges
- When merge succeeds without conflicts (ff or regular), no AI is invoked — this is the fast path
