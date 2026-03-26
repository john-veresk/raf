---
effort: medium
---
# Task: Add `pushOnComplete` config option

## Objective
Add a configurable `pushOnComplete` boolean that pushes the current branch to remote after successful `raf do` execution, in both worktree and non-worktree modes.

## Context
Currently, pushing after execution only happens in worktree mode when the user selects "Create PR" as the post-action. There's no way to automatically push after non-worktree execution, and worktree merge doesn't push either. This feature adds opt-in auto-push for both flows.

## Requirements
- New config field `pushOnComplete: boolean` (default: `false`)
- In **non-worktree mode**: after successful execution, push the current branch to `origin`
- In **worktree mode** with **merge** action: after successful merge into the original branch, push that branch to `origin`
- Only push when execution succeeds (all tasks pass)
- Log success/failure of the push operation
- Use existing `pushMainBranch()`-style git push pattern (or a new generic `pushCurrentBranch()` function)

## Implementation Steps

### 1. Add config field to `src/types/config.ts`

Add `pushOnComplete: boolean` to the `RafConfig` interface (after `syncMainBranch`):

```typescript
/** Push the current branch to remote after successful execution. Default: false */
pushOnComplete: boolean;
```

Add to `DEFAULT_CONFIG`:

```typescript
pushOnComplete: false,
```

### 2. Update `src/utils/config.ts`

**a) Add `pushOnComplete` to `VALID_TOP_LEVEL_KEYS`** (line 39-43):

```typescript
const VALID_TOP_LEVEL_KEYS = new Set<string>([
  'models', 'effortMapping', 'codex',
  'timeout', 'maxRetries', 'autoCommit',
  'worktree', 'syncMainBranch', 'pushOnComplete', 'commitFormat',
]);
```

**b) Add validation** (after the `syncMainBranch` validation block, around line 303):

```typescript
// pushOnComplete
if (obj.pushOnComplete !== undefined) {
  if (typeof obj.pushOnComplete !== 'boolean') {
    throw new ConfigValidationError('pushOnComplete must be a boolean');
  }
}
```

**c) Add merge logic** in `mergeConfig()` (after the `syncMainBranch` merge line, around line 389):

```typescript
if (overrides.pushOnComplete !== undefined) result.pushOnComplete = overrides.pushOnComplete;
```

**d) Add getter function** (after `getSyncMainBranch()`):

```typescript
export function getPushOnComplete(): boolean {
  return getResolvedConfig().pushOnComplete;
}
```

### 3. Add a `pushCurrentBranch()` helper in `src/core/worktree.ts`

The existing `pushMainBranch()` detects and pushes the main branch specifically. Add a new function that pushes whatever branch is currently checked out:

```typescript
export function pushCurrentBranch(cwd?: string): SyncMainBranchResult {
  // Get the current branch name
  const branch = getCurrentBranch(cwd);
  if (!branch) {
    return { success: false, mainBranch: null, hadChanges: false, error: 'Could not determine current branch' };
  }
  try {
    execSync(`git push origin ${branch}`, { encoding: 'utf-8', stdio: 'pipe', ...(cwd ? { cwd } : {}) });
    return { success: true, mainBranch: branch, hadChanges: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Everything up-to-date')) {
      return { success: true, mainBranch: branch, hadChanges: false };
    }
    return { success: false, mainBranch: branch, hadChanges: false, error: `Failed to push ${branch}: ${msg}` };
  }
}
```

Note: Reuses `SyncMainBranchResult` type (the `mainBranch` field will hold the current branch name — consider renaming to `branch` if it reads better, but not strictly necessary).

### 4. Add push-on-complete logic to `src/commands/do.ts`

In `runDoCommand()`, after the post-action block (around line 427), and before the exit code check (line 430), add:

```typescript
// Push to remote after successful execution (if enabled)
if (result.success && getPushOnComplete()) {
  const pushResult = pushCurrentBranch();
  if (pushResult.success) {
    if (pushResult.hadChanges) {
      logger.info(`Pushed ${pushResult.mainBranch} to remote`);
    }
  } else {
    logger.warn(`Could not push to remote: ${pushResult.error}`);
  }
}
```

For **worktree merge** mode specifically: the push should happen after merge completes (inside `executePostAction`, in the `'merge'` case, after the successful merge log). This is because after merge, the cwd is back on the original branch — which is the branch to push.

In the `'merge'` case of `executePostAction()`, after `logger.success(...)` (around line 500), add:

```typescript
if (getPushOnComplete()) {
  const pushResult = pushCurrentBranch();
  if (pushResult.success) {
    if (pushResult.hadChanges) {
      logger.info(`Pushed ${originalBranch} to remote`);
    }
  } else {
    logger.warn(`Could not push to remote: ${pushResult.error}`);
  }
}
```

### 5. Update imports in `do.ts`

Add `getPushOnComplete` to the config import and `pushCurrentBranch` to the worktree import.

## Acceptance Criteria
- [ ] `pushOnComplete` field exists in `RafConfig` interface and `DEFAULT_CONFIG` with default `false`
- [ ] `raf config set pushOnComplete true` works
- [ ] Non-worktree mode: after successful `raf do`, current branch is pushed to origin when enabled
- [ ] Worktree merge mode: after successful merge, the merged-into branch is pushed to origin when enabled
- [ ] Push failures log a warning but don't fail the overall execution
- [ ] No push occurs when execution fails (tasks have errors)
- [ ] No push occurs when `pushOnComplete` is `false` (default)

## Notes
- The worktree PR action already pushes the branch as part of PR creation — no change needed there.
- The worktree "leave" action doesn't merge, so there's nothing to push — no change needed.
- Reuses `SyncMainBranchResult` type even though the branch may not be "main" — the type name is a minor misnomer but the structure fits.
