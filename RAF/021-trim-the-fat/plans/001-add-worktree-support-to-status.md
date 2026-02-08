# Task: Add Automatic Worktree Discovery to raf status

## Objective
Make `raf status` always discover and display worktree projects alongside main repo projects — no flag required.

## Context
Currently `raf status` only discovers and displays projects from the main RAF directory. Projects that exist only in worktrees (`~/.raf/worktrees/<repo>/<project>/`) are invisible to the status command. This makes it hard to track worktree project progress without running `raf do --worktree`. Worktree discovery should be automatic — if a git repo is detected and worktree projects exist, they should appear.

## Requirements
- **No new flag** — worktree discovery happens automatically when the current directory is inside a git repo
- **List mode** (`raf status`): Show main repo projects as normal, then append a `Worktrees:` section at the bottom listing worktree projects that DIFFER from their main repo counterpart (indented). A worktree project "differs" if it has more tasks (amend added new ones) or different task statuses. If the worktree state is identical to main repo, skip it. Worktree-only projects (no main repo counterpart) are always shown.
- **Single project mode** (`raf status <project>`): Show the project from BOTH main repo and worktree only when they differ. This is common after `--amend` — e.g., main repo shows 5/5 tasks completed (original plan), while worktree shows 5/7 (amended with 2 new tasks not yet executed). Display both states, clearly labeled (e.g., "Main:" and "Worktree:"). If the states are identical, show just the main view without any worktree label. If the project only exists in worktree, show just that one.
- Both modes should support the existing `--json` flag (include worktree data in JSON output)
- Gracefully handle non-git-repo case: if `getRepoBasename()` returns null, skip worktree discovery silently
- Use existing worktree utilities: `getRepoBasename()`, `listWorktreeProjects()`, `computeWorktreePath()`, `computeWorktreeBaseDir()` from `src/core/worktree.ts`
- Use existing state derivation: `deriveProjectState()`, `getDerivedStats()` from `src/core/state-derivation.ts`
- Follow existing patterns in `src/commands/do.ts` for worktree project resolution (searching worktree directories, resolving identifiers within them)

## Implementation Steps
1. In `runStatusCommand()` in `src/commands/status.ts`, after the main repo logic, attempt worktree discovery using `getRepoBasename()` and `listWorktreeProjects()`. If not in a git repo, skip silently.
2. For list mode: discover worktree projects, filter out any that already appear in main repo projects (match by folder name), then display remaining under a `Worktrees:` header with indentation. Derive state for each worktree project to show progress bars.
3. For single-project mode: resolve the project identifier in both main repo and worktrees. If found in both, show two progress displays labeled "Main:" and "Worktree:". If found in only one, show just that.
4. Update the `--json` output to include worktree project data when worktree projects are discovered
5. Update tests in `tests/unit/status-command.test.ts` to cover worktree discovery for both list and single-project modes
6. Update README.md `raf status` section to mention that worktree projects are shown automatically
7. Update CLAUDE.md to mention automatic worktree discovery in the status command

## Acceptance Criteria
- [ ] `raf status` lists main repo projects normally, then worktree projects that differ under a `Worktrees:` header
- [ ] Worktree projects identical to their main repo counterpart are not shown
- [ ] `raf status <project>` shows both main repo and worktree state only when they differ
- [ ] `raf status <project>` shows just worktree state when project only exists in worktree
- [ ] `--json` includes worktree project data
- [ ] Non-git-repo environments work fine (worktree section just doesn't appear)
- [ ] README.md and CLAUDE.md updated
- [ ] Tests cover the new functionality
- [ ] All existing tests pass

## Notes
- The worktree project resolution pattern already exists in `do.ts` — reuse that logic (or extract shared utility if the duplication is significant)
- `listWorktreeProjects()` returns folder names like `['020-my-feature', '021-another']` — use `extractProjectNumber()` and `extractProjectName()` to display them consistently with main repo projects
- Worktree projects need their RAF relative path computed (from repo root to RAF dir) to find the project folder inside the worktree, same as `do.ts` does
- No changes needed to `StatusCommandOptions` type or command definition — this is automatic behavior, not a flag
