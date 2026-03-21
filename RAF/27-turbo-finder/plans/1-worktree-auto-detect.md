# Task: Auto-detect worktree projects in `raf do`

## Objective
Make `raf do <name>` and `raf do <id>` automatically find and run worktree projects without requiring the `--worktree` flag.

## Context
Currently, `raf do <identifier>` without `--worktree` only searches the main repo's RAF directory. If a project lives exclusively in a worktree (or the user simply omits the flag), the command fails with "project not found". The worktree folder name matches the project folder name (e.g., `~/.raf/worktrees/<repo>/ahrren-turbo-finder/`), so resolution can leverage this naming convention.

When a worktree project is auto-detected, the full worktree flow should activate — including the post-execution action picker (merge/PR/leave), worktree cwd, and cleanup behavior — exactly as if `--worktree` had been passed.

## Requirements
- When `raf do <name>` (e.g., `turbo-finder`) doesn't find the project in the main repo, fall back to searching worktree directories
- When `raf do <id>` (e.g., `ahrren`) doesn't find the project in the main repo, fall back to searching worktree directories
- When `raf do <full-folder>` (e.g., `ahrren-turbo-finder`) doesn't find the project in the main repo, fall back to searching worktree directories
- Use the worktree folder naming convention: worktree folders at `~/.raf/worktrees/<repo-basename>/<project-folder>/` where `<project-folder>` matches the project folder name format (`XXXXXX-name`)
- Match identifiers against worktree folder names using the same resolution logic as `resolveProjectIdentifierWithDetails` (full name, base26 ID, or project name)
- When a worktree project is auto-detected, enable the full worktree mode: set `worktreeMode = true`, `worktreeRoot`, `originalBranch`, and trigger the post-execution action picker
- If project exists in both main repo and worktree, prefer the worktree version (consistent with existing picker deduplication behavior)

## Implementation Steps
1. In `runDoCommand()` in `src/commands/do.ts`, modify the non-worktree resolution path (currently around line 305) to add a worktree fallback
2. After `resolveProjectIdentifierWithDetails(rafDir, projectIdentifier)` fails (returns no path), check if the current directory is a git repo
3. If in a git repo, use `listWorktreeProjects(repoBasename)` to get worktree project folders
4. For each worktree folder, attempt to match the identifier using the same resolution strategy: full folder name match, base26 prefix match, or name-portion match
5. If a match is found, set `worktreeMode = true`, compute `worktreeRoot`, record `originalBranch`, and proceed through the existing worktree validation and execution flow
6. Consider also checking worktrees FIRST (before main repo) or in parallel, to match the picker behavior where worktree versions take priority over main repo versions
7. Add unit tests for the new auto-detection logic
8. Add integration-level tests verifying the full flow (identifier → worktree detection → worktree mode enabled)

## Acceptance Criteria
- [ ] `raf do turbo-finder` finds and runs a worktree project named `ahrren-turbo-finder`
- [ ] `raf do ahrren` finds and runs a worktree project with ID `ahrren`
- [ ] `raf do ahrren-turbo-finder` finds and runs the worktree project by full folder name
- [ ] Auto-detected worktree projects trigger the post-execution action picker (merge/PR/leave)
- [ ] Auto-detected worktree projects execute with the worktree as cwd
- [ ] If project exists in both main and worktree, worktree version is preferred
- [ ] Existing `--worktree` flag behavior is unchanged
- [ ] All existing tests pass
- [ ] New tests cover the auto-detection scenarios

## Notes
- The existing worktree resolution code (lines 240-304 in `do.ts`) already handles the case where `--worktree` is passed. The new code should reuse as much of that logic as possible rather than duplicating it.
- `listWorktreeProjects()` from `src/core/worktree.ts` returns sorted folder names. Resolution against these can use string matching without needing filesystem reads into each worktree's RAF dir.
- Be careful with the `projectFolderName` variable scoping — it's currently declared inside the worktree block and needs to be accessible when auto-detection sets worktree mode.
