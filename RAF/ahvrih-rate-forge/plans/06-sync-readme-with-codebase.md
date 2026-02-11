# Task: Sync README with Codebase (Critical Items)

## Objective
Fix critical discrepancies between README.md and the actual codebase implementation.

## Context
The README documents features that no longer exist (like `--merge` flag) and is missing documentation for major features (post-execution picker, PR creation). This causes user confusion and makes the tool harder to adopt.

## Dependencies
01, 05

## Requirements
Fix these three critical discrepancies:

### 1. Remove `--merge` flag references
The `--merge` CLI flag for `raf do` is documented in the README but does not exist in the code. It was replaced by an interactive post-execution action picker. All references to `--merge` must be removed and replaced with the actual behavior.

Affected locations in README:
- Usage examples showing `raf do my-feature -w --merge`
- Command Reference table listing `--merge` as a flag
- Any other mentions of `--merge`

### 2. Document the post-execution action picker
When running `raf do` in worktree mode, an interactive picker appears BEFORE task execution asking what to do after tasks complete. The three options are:
- **Merge** — merge branch into the original branch (fast-forward preferred, merge-commit fallback)
- **Create PR** — push branch and create a GitHub PR
- **Leave branch** — keep the branch as-is, do nothing

This is implemented in `src/commands/do.ts` via `pickPostExecutionAction()`. On task failure, the chosen post-action is skipped. After successful post-actions (merge, PR, leave), the worktree directory is cleaned up automatically (the git branch is preserved).

### 3. Document PR creation from worktree
The "Create PR" post-execution action is a significant feature not mentioned in the README at all. It:
- Requires `gh` CLI installed and authenticated
- Auto-detects the base branch from `origin/HEAD`
- Generates a PR title from the project name
- Generates a PR body using Claude summarizing input.md, decisions.md, and outcomes
- Auto-pushes the branch to origin if needed
- Runs preflight checks; falls back to "leave branch" if `gh` is missing or unauthenticated

Also fix the worktree cleanup description — the README currently says worktrees persist and need manual cleanup, but they're actually auto-cleaned after post-actions (only the git branch is preserved). On failure, the worktree IS kept for inspection.

## Implementation Steps
1. Read the current README.md thoroughly
2. Remove all `--merge` flag references from examples and command reference
3. Update the Worktree Mode section to describe the post-execution picker flow
4. Add documentation about PR creation capability and its requirements (`gh` CLI)
5. Fix the worktree cleanup description to reflect auto-cleanup behavior
6. Ensure examples in the README use valid, existing flags only
7. Review the updated text for consistency and accuracy

## Acceptance Criteria
- [ ] No references to `--merge` flag remain in README
- [ ] Post-execution action picker is documented with all three options
- [ ] PR creation from worktree is documented including prerequisites
- [ ] Worktree cleanup behavior is accurately described
- [ ] All CLI examples use valid, existing flags
- [ ] README reads naturally and doesn't feel patched

## Notes
- This task depends on 01 (remove `claudeCommand`) and 05 (sync main branch) because those tasks add/change config keys that should be reflected if mentioned in README.
- Only fix the critical items listed above. Medium and low priority discrepancies (missing verbose flag in table, blocked symbol, token tracking docs, effort/pricing docs) are out of scope for this task.
