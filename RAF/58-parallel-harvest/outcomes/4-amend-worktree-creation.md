# Amend Worktree Creation

## Summary
Added worktree creation logic to `raf plan --amend` so that when `config.worktree: true` and the project is in the main repo, a worktree is created and the amend session runs there instead of on the main branch.

## Changes
- **src/commands/plan.ts**:
  - Added imports for `branchExists` and `createWorktreeFromBranch` from `../core/worktree.js`
  - Added step 3 after main-repo fallback: checks `getWorktreeDefault()`, syncs main branch if configured, creates worktree (reusing existing branch or creating new one), updates `worktreePath` and `projectPath` to point to the worktree
  - Falls back to main repo with a warning if worktree creation fails

## Notes
- Pattern mirrors the new-project worktree flow already in `plan.ts`
- Downstream code (editor, Claude session, commit) automatically uses the updated `worktreePath`/`projectPath` variables — no further changes needed
- All 1173 relevant tests pass; pre-existing failures in `claude-runner.test.ts` and `post-execution-picker.test.ts` are unrelated

<promise>COMPLETE</promise>
