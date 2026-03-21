# Task 3: Remove --worktree Flag from raf do — Auto-detect Project Location

## Summary
Removed `--worktree` and `--no-worktree` CLI flags from `raf do`. Project location (worktree vs main repo) is now always auto-detected. The combined picker and worktree-first resolution are the only code paths.

## Changes Made

### File: `src/commands/do.ts`
- Removed `-w, --worktree` and `--no-worktree` option lines from `createDoCommand()`
- Removed `worktreeMode` variable and all assignments to it
- Removed the early `if (worktreeMode)` block that did worktree-specific setup — the combined picker flow now handles both worktree and main projects
- Replaced `if (worktreeMode)` in resolution with `if (worktreeRoot)` — when the picker sets worktreeRoot, resolve within that worktree; otherwise auto-detect (worktree first, then main)
- Moved main branch sync (`pullMainBranch`) to after project resolution, triggered by `worktreeRoot` being set
- Replaced `worktreeMode && worktreeRoot` guards with just `worktreeRoot`
- Removed unused `discoverAndPickWorktreeProject` function
- Cleaned up unused imports: `getWorktreeDefault`, `discoverProjects`, `formatProjectChoice`, `computeWorktreePath`, `computeWorktreeBaseDir`, `validateWorktree`, `listWorktreeProjects`

### File: `src/types/config.ts`
- Removed `worktree?: boolean` from `DoCommandOptions` interface

### File: `src/commands/plan.ts`
- Removed `--worktree` from `raf do` suggestions in user-facing log messages (2 locations)

### File: `src/prompts/planning.ts`
- Removed `worktreeFlag` variable and `worktreeMode` destructuring — `raf do` instruction no longer includes `--worktree`

### File: `src/prompts/amend.ts`
- Removed `worktreeFlag` variable and `worktreeMode` destructuring — `raf do` instruction no longer includes `--worktree`

### File: `src/prompts/config-docs.md`
- Updated `worktree` config description to note that `raf do` auto-detects regardless of this setting

## Verification
- TypeScript compiles without errors (`npm run build`)
- All acceptance criteria met:
  - `raf do` CLI no longer accepts `--worktree` or `--no-worktree`
  - `raf do` (no args) shows combined picker of worktree + main projects
  - `raf do <project>` auto-detects if project is in worktree or main
  - Post-execution worktree actions (merge/PR/leave) still work correctly (triggered by `worktreeRoot`)

<promise>COMPLETE</promise>
