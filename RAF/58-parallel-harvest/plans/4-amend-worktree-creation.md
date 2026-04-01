---
effort: medium
---
# Task: Create Worktree When Amending Main-Repo Projects

## Objective
When `raf plan --amend` targets a project in the main repo and `config.worktree` is `true`, create a worktree and run the amend session there instead of on the main branch.

## Context
Currently `runAmendCommand` in `src/commands/plan.ts:355` auto-detects the project location (worktree first, then main repo) but never checks `getWorktreeDefault()`. If a project lives in the main repo and `config.worktree: true`, the amend session runs on the main branch — ignoring the user's worktree preference. The new-project flow (`plan.ts:197-241`) already handles this correctly by calling `getWorktreeDefault()` and creating a worktree. The amend flow needs the same logic.

Since project files are tracked in git, creating a worktree from the current branch automatically includes the RAF project folder — no explicit file copying is needed.

## Dependencies
2 (see outcomes/2-multi-project-execution.md)

## Requirements
- After resolving a project to the main repo (plan.ts:382-401), check `getWorktreeDefault()`
- If worktree is enabled, check if a branch matching the project folder name already exists via `branchExists()`
- If branch exists: use `createWorktreeFromBranch(repoBasename, folderName)` to attach to it
- If branch does not exist: use `createWorktree(repoBasename, folderName)` to create a new branch
- Update `worktreePath` and `projectPath` to point to the new worktree location
- If worktree creation fails, fall back to main repo (same pattern as the new-project flow)
- The rest of the amend flow (editor, Claude session, commit) must use the worktree paths

## Implementation Steps

### 1. Add worktree creation logic after main-repo fallback (`src/commands/plan.ts:382-401`)

After the existing block that resolves the project to the main repo (`if (!projectPath) { ... projectPath = resolution.path; }`), add a new block that checks whether to migrate to a worktree:

```typescript
// 3. If project is in main repo but worktree mode is enabled, create a worktree
if (!worktreePath && repoBasename) {
  const worktreeEnabled = getWorktreeDefault();
  if (worktreeEnabled) {
    // Extract project folder name from the resolved path
    const folderName = path.basename(projectPath);

    // Sync main branch before branching (same as new-project flow)
    if (getSyncMainBranch()) {
      logger.info('Syncing main branch...');
      const syncResult = pullMainBranch();
      if (!syncResult.success) {
        logger.warn(`Could not sync main branch: ${syncResult.error}`);
      }
    }

    // Reuse existing branch or create new one
    const wtResult = branchExists(folderName)
      ? createWorktreeFromBranch(repoBasename, folderName)
      : createWorktree(repoBasename, folderName);

    if (wtResult.success) {
      worktreePath = wtResult.worktreePath;
      // Recompute projectPath inside the worktree
      const repoRoot = getRepoRoot()!;
      const rafRelativePath = path.relative(repoRoot, rafDir);
      projectPath = path.join(worktreePath, rafRelativePath, folderName);
      logger.info(`Created worktree for amendment: ${worktreePath}`);
      logger.info(`Worktree branch: ${wtResult.branch}`);
    } else {
      logger.warn(`Worktree creation failed: ${wtResult.error}`);
      logger.warn('Continuing amendment in main repo.');
    }
  }
}
```

### 2. Add necessary imports to `src/commands/plan.ts`

Ensure these are imported (some may already be present):
- `getWorktreeDefault` from `../utils/config`
- `getSyncMainBranch` from `../utils/config`
- `pullMainBranch` from `../core/git`
- `branchExists`, `createWorktree`, `createWorktreeFromBranch` from `../core/worktree`
- `getRepoRoot` from `../core/git` (likely already imported)

Check existing imports first — only add what's missing.

### 3. Verify downstream code uses the updated paths

The rest of `runAmendCommand` already uses `worktreePath` and `projectPath` correctly:
- `deriveProjectState(projectPath)` at line 404 — will read from worktree
- `getPlansDir(projectPath)` at line 418 — will resolve plans in worktree
- `getInputPath(projectPath)` at line 435 — will read input.md from worktree
- `cwd: worktreePath ?? undefined` at line 515 — will run Claude in worktree
- `commitPlanningArtifacts(projectPath, { cwd: worktreePath })` at line 550 — will commit in worktree

No changes needed to these downstream calls — the variable reassignment handles everything.

## Acceptance Criteria
- [ ] `raf plan --amend <project>` creates a worktree when `config.worktree: true` and the project is in the main repo
- [ ] If a branch matching the project folder name exists, the worktree attaches to that branch (via `createWorktreeFromBranch`)
- [ ] If no matching branch exists, a new branch is created (via `createWorktree`)
- [ ] If worktree creation fails, the amend falls back to the main repo with a warning
- [ ] Projects already in a worktree are unaffected (worktree path detected in step 1, step 3 is skipped)
- [ ] The amend session (editor, Claude, commit) all operate in the worktree when one is created
- [ ] Main branch is synced before worktree creation (consistent with new-project flow)

## Notes
- The insertion point is between lines 401 and 403 in `src/commands/plan.ts` — after `projectPath = resolution.path` and before `deriveProjectState(projectPath)`
- The pattern mirrors `plan.ts:197-241` (new-project worktree flow) but is simpler since the project structure already exists in git
- `branchExists()` is exported from `src/core/worktree.ts:273` and checks local branches via `git rev-parse --verify`
- No changes needed to `raf do` — once the amend creates the worktree, `raf do` will auto-detect it (worktree resolution takes priority)
