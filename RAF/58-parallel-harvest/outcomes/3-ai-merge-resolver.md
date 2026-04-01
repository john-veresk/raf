# AI-Powered Merge Conflict Resolution

## Summary
Added AI-powered merge conflict resolution to the worktree merge flow. When `git merge` produces conflicts, RAF now invokes a configured AI harness (non-interactively) to read project context, resolve all conflicts, and commit with a RAF-formatted merge message. The merge flow order was also changed to attempt merge before worktree cleanup.

## Changes
- **src/types/config.ts**: Added `'merge'` to `ModelScenario` and `CommitFormatType` unions, added `merge: ModelEntry` to `ModelsConfig`, added `merge: string` to `CommitFormatConfig`, added defaults (`{ model: 'opus', harness: 'claude' }` and `'{prefix}[{projectName}] Merge: {branchName} into {targetBranch}'`), updated `buildConfigSchema` to fill merge model entry
- **src/utils/config.ts**: Added `'merge'` to `VALID_MODEL_KEYS` and `VALID_COMMIT_FORMAT_KEYS` sets, added merge entry to `deepMerge` and `resolveConfig` model spreads
- **src/core/worktree.ts**: Added `resolveConflictsWithAI()` function that creates a runner, builds a detailed prompt with project context (plans, decisions, outcomes), and runs non-interactively; changed `mergeWorktreeBranch()` to async with AI fallback on conflicts — aborts merge if AI also fails
- **src/commands/do.ts**: Reordered merge case in `executePostAction` — merge happens before worktree cleanup; extracts `projectName` and passes it along with `projectPath` to `mergeWorktreeBranch`
- **src/prompts/config-docs.md**: Added `models.merge` and `commitFormat.merge` to config reference tables, template variables, and full example config
- **tests/unit/worktree.test.ts**: Updated mocks for new transitive dependencies (runner-factory, config utils), updated `mergeWorktreeBranch` tests for async + new params, added tests for AI conflict resolution (success and failure cases)

## Notes
- `raf config set models.merge.model sonnet` works because `merge` is in `VALID_MODEL_KEYS` and `buildConfigSchema` fills the entry
- Fast-forward and clean merges are unaffected — AI is only invoked when conflicts are detected
- All 126 relevant tests pass; 8 pre-existing config test failures (display-related) are unrelated

<promise>COMPLETE</promise>
