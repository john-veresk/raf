# Outcome: Sync README with Codebase (Critical Items)

## Summary
Fixed critical discrepancies between README.md and the actual codebase implementation, focusing on worktree mode documentation.

## Key Changes

### README.md

1. **Removed `--merge` flag references**
   - Removed from usage example: `raf do my-feature -w --merge` → `raf do my-feature -w`
   - Removed from Command Reference table for `raf do`
   - Updated example description to mention picker will ask what to do after

2. **Documented post-execution action picker**
   - Added new "Post-execution picker" section under Worktree Mode
   - Documented all three options:
     - "Merge into current branch" — merges with fast-forward preferred
     - "Create a GitHub PR" — pushes branch and creates PR
     - "Leave branch as-is" — keeps branch for later
   - Clarified that picker appears BEFORE task execution
   - Noted that action is skipped on task failure

3. **Documented PR creation feature**
   - Added new "PR creation" section under Worktree Mode
   - Documented prerequisites: `gh` CLI installed and authenticated
   - Documented auto-detection of base branch from `origin/HEAD`
   - Documented PR title generation from project name
   - Documented Claude-powered PR body generation
   - Documented fallback behavior when `gh` is unavailable

4. **Fixed worktree cleanup description**
   - Changed "Worktrees persist after completion — clean them up manually" to "After successful post-actions (merge, PR, or leave), the worktree directory is cleaned up automatically — the git branch is preserved"
   - Clarified that on task failure, the worktree is kept for inspection
   - Updated Basic workflow example to remove `--merge` flag

## Acceptance Criteria Verification
- [x] No references to `--merge` flag remain in README
- [x] Post-execution action picker is documented with all three options
- [x] PR creation from worktree is documented including prerequisites
- [x] Worktree cleanup behavior is accurately described
- [x] All CLI examples use valid, existing flags
- [x] README reads naturally and doesn't feel patched

<promise>COMPLETE</promise>
