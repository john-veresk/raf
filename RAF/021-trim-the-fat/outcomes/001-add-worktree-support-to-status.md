# Outcome: Add Automatic Worktree Discovery to raf status

## Summary

Added automatic worktree project discovery to `raf status`. When inside a git repo, the status command now discovers and displays worktree projects from `~/.raf/worktrees/<repo>/` alongside main repo projects, with no flag required.

## Key Changes

### `src/commands/status.ts`
- Added `getWorktreeContext()` to resolve repo basename and RAF relative path
- Added `discoverWorktreeProjectStates()` to scan worktree directories and derive project state
- Added `projectStatesDiffer()` to compare main vs worktree project states (by task count and statuses)
- **List mode** (`raf status`): Shows main repo projects normally, then appends a `Worktrees:` section listing worktree projects that differ from their main repo counterpart. Identical projects are hidden. Worktree-only projects always shown.
- **Single project mode** (`raf status <project>`): Shows both "Main:" and "Worktree:" progress bars when states differ. Shows only one view when identical or when project exists in only one location.
- **JSON output**: List mode wraps in `{ projects: [...], worktrees: [...] }`. Single project mode adds `worktree` field when worktree data exists.
- Gracefully handles non-git-repo case (skips worktree discovery silently)

### `tests/unit/status-command.test.ts`
- Added 10 new tests covering:
  - Project state comparison (identical states, differing task counts, differing statuses)
  - Worktree project discovery patterns
  - Filtering worktree-only vs counterpart projects
  - Stats computation for worktree projects

### `README.md`
- Updated `raf status` section to mention automatic worktree discovery

### `CLAUDE.md`
- Added worktree discovery details to the Worktree Mode section

## Acceptance Criteria Verification

- [x] `raf status` lists main repo projects normally, then worktree projects that differ under a `Worktrees:` header
- [x] Worktree projects identical to their main repo counterpart are not shown
- [x] `raf status <project>` shows both main repo and worktree state only when they differ
- [x] `raf status <project>` shows just worktree state when project only exists in worktree
- [x] `--json` includes worktree project data
- [x] Non-git-repo environments work fine (worktree section just doesn't appear)
- [x] README.md and CLAUDE.md updated
- [x] Tests cover the new functionality (10 new tests, all passing)
- [x] All existing tests pass (1 pre-existing failure in planning-prompt.test.ts unrelated to changes)

<promise>COMPLETE</promise>
