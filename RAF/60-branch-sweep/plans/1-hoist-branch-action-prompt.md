---
effort: medium
---
# Task: Hoist branch action prompt before the execution loop

## Objective
Ask the post-execution branch action (merge/PR/leave) once for all selected worktree projects instead of per-project.

## Context
Currently in `src/commands/do.ts`, `pickPostExecutionAction()` is called inside the per-project loop (line 409), showing a prompt per worktree project with its specific branch name. When multiple projects are selected, this is repetitive. The prompt should appear once before the loop, listing all worktree branch names, and the chosen action applies to every worktree project.

## Requirements
- Collect all worktree branch names from `projectsToRun` before the execution loop
- If any worktree projects exist, show the branch action picker once
- **Singular (1 worktree project):** Keep current message: `After tasks complete, what should happen with branch "X"?` with singular choice labels (`Leave branch as-is`)
- **Plural (2+ worktree projects):** New message: `After tasks complete, what should happen with branches "X", "Y"?` with pluralized choice labels (`Leave branches as-is`)
- Apply the chosen action to all worktree projects in the loop
- **PR preflight:** Move from `pickPostExecutionAction` to per-project execution time inside `executePostAction`. If preflight fails for a specific project, only that project falls back to `leave` — others still get PRs.
- Skip the prompt entirely if no worktree projects are in the selection

## Implementation Steps

### 1. Refactor `pickPostExecutionAction` signature and logic (`src/commands/do.ts:525-548`)

Change the function to accept an array of branch names instead of a single worktree root:

```typescript
export async function pickPostExecutionAction(branchNames: string[]): Promise<PostExecutionAction> {
  const plural = branchNames.length > 1;
  const branchList = branchNames.map(b => `"${b}"`).join(', ');

  const chosen = await select<PostExecutionAction>({
    message: plural
      ? `After tasks complete, what should happen with branches ${branchList}?`
      : `After tasks complete, what should happen with branch ${branchList}?`,
    choices: [
      { name: 'Merge into current branch', value: 'merge' as const },
      { name: 'Create a GitHub PR', value: 'pr' as const },
      { name: plural ? 'Leave branches as-is' : 'Leave branch as-is', value: 'leave' as const },
    ],
  });

  return chosen;
}
```

Remove the PR preflight check from this function entirely.

### 2. Hoist the prompt call before the execution loop (`src/commands/do.ts:389`)

Before the `for (const project of projectsToRun)` loop:

```typescript
// Determine post-execution action for all worktree projects upfront
let postAction: PostExecutionAction = 'leave';
const worktreeProjects = projectsToRun.filter(p => p.worktreeRoot);
if (worktreeProjects.length > 0) {
  const branchNames = worktreeProjects.map(p => path.basename(p.worktreeRoot!));
  try {
    postAction = await pickPostExecutionAction(branchNames);
  } catch (error) {
    if (error instanceof Error && error.message.includes('User force closed')) {
      process.exit(0);
    }
    throw error;
  }
}
```

### 3. Remove per-project picker call from the loop (`src/commands/do.ts:391-415`)

Remove the `let postAction` declaration and the `pickPostExecutionAction` call from inside the loop. The `postAction` variable is now declared before the loop.

Keep the main-branch sync and rebase logic inside the loop (they are per-project operations that depend on the specific worktree root).

### 4. Move PR preflight to `executePostAction` (`src/commands/do.ts:554+`)

At the top of the `'pr'` case in `executePostAction`, add the preflight check:

```typescript
case 'pr': {
  const preflight = prPreflight(worktreeBranch, worktreeRoot);
  if (!preflight.ready) {
    logger.warn(`PR preflight failed for "${worktreeBranch}": ${preflight.error}`);
    logger.warn('Falling back to "Leave branch" — you can create a PR manually later.');
    // Fall through to leave behavior
    removeWorktree(worktreeRoot);
    logger.info(`Branch "${worktreeBranch}" preserved — worktree directory cleaned up.`);
    break;
  }
  // ... existing PR creation logic
}
```

### 5. Update tests (`tests/unit/post-execution-picker.test.ts`)

- Update `pickPostExecutionAction` calls to pass `string[]` instead of a worktree root path
- Update message assertions to match new format
- Remove preflight tests from picker tests (preflight now in `executePostAction`)
- Add new tests for plural/singular message variants
- Add a test verifying PR preflight fallback in executePostAction context

## Acceptance Criteria
- [ ] Multi-project worktree run shows branch action prompt exactly once before execution starts
- [ ] Prompt lists all worktree branch names when multiple projects selected
- [ ] Prompt uses singular wording when only one worktree project selected
- [ ] Chosen action applies to all worktree projects
- [ ] PR preflight failure for one project doesn't affect other projects' PR creation
- [ ] No prompt shown when all selected projects are local (non-worktree)
- [ ] Existing tests updated and passing
- [ ] `npm test` passes

## Notes
- The `prPreflight` function checks global state (gh CLI installed, authenticated, GitHub remote) so it will almost always pass or fail for all projects identically. But honoring per-project fallback is correct for edge cases and future-proofing.
- The main-branch sync (`pullMainBranch`) and rebase (`rebaseOntoMain`) remain per-project inside the loop since they operate on specific worktree roots.
