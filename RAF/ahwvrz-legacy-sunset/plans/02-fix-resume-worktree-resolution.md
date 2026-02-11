---
effort: medium
---
# Task: Fix `--resume` worktree project resolution

## Objective
Fix `raf plan --resume` to find projects that exist in worktrees, auto-detecting worktree mode without requiring the `--worktree` flag.

## Context
Running `raf plan --resume ahwvrz-legacy-sunset --worktree` from the main branch fails with "Project not found" because `runResumeCommand()` only searches the main repo's `RAF/` directory. Since the project was created in a worktree, it doesn't exist on the `main` branch — only in `~/.raf/worktrees/RAF/ahwvrz-legacy-sunset/`.

The `--amend` command already handles this correctly by searching worktree directories first. The `--resume` command needs the same treatment, plus auto-detection so `--worktree` is optional.

## Dependencies
01

## Requirements
- `runResumeCommand()` must search worktree directories in addition to the main repo
- Worktree projects take priority over main repo projects (when both exist)
- `--worktree` flag is optional — auto-detect if the project lives in a worktree
- When a project is found in a worktree, auto-enable worktree mode (use worktree path as CWD)
- When `--worktree` is explicitly passed, still search worktrees first
- Existing behavior preserved: if project only exists in main repo, use main repo as before
- Handle edge cases: ambiguous matches in worktrees, invalid/broken worktrees

## Implementation Steps

1. **Update `runResumeCommand()` signature** in `src/commands/plan.ts` (line 684)
   - The function currently only accepts `(identifier: string, model?: string)`
   - It does NOT need a `worktreeMode` parameter since auto-detection is the desired behavior
   - The existing signature is fine — the function should always search both locations

2. **Refactor project resolution in `runResumeCommand()`** (lines 693-741)
   - Currently the function resolves from main repo first (lines 693-709), then checks for a worktree (lines 714-741)
   - The problem: if main repo resolution fails, it exits before ever checking worktrees
   - New approach: search BOTH locations, prefer worktree
   - Use `resolveWorktreeProjectByIdentifier()` from `src/core/worktree.ts` to search worktrees (this function already exists and is used by `runAmendCommand`)
   - Resolution order:
     1. Try worktree resolution via `resolveWorktreeProjectByIdentifier()`
     2. If found in worktree: use worktree path, validate it with `validateWorktree()`
     3. If NOT found in worktree: fall back to main repo resolution via `resolveProjectIdentifierWithDetails()`
     4. If not found anywhere: show error
   - Remove the redundant worktree detection block (lines 714-741) since worktree search happens upfront now

3. **Update the call site** in `src/commands/plan.ts` (line 90)
   - Currently: `await runResumeCommand(options.resume, model);`
   - No change needed here since the function signature stays the same — worktree detection is automatic

4. **Set the correct `resumeCwd`**
   - If resolved from worktree: `resumeCwd` = worktree root (e.g., `~/.raf/worktrees/RAF/ahwvrz-legacy-sunset/`)
   - If resolved from main repo but worktree exists: `resumeCwd` = worktree root (existing behavior preserved)
   - If resolved from main repo with no worktree: `resumeCwd` = main repo project path

5. **Add tests** in `tests/unit/` for the resume worktree resolution
   - Test: project only in worktree → found and worktree CWD used
   - Test: project in both → worktree takes priority
   - Test: project only in main repo → main repo CWD used
   - Test: project not found anywhere → error message

## Acceptance Criteria
- [ ] `raf plan --resume ahwvrz-legacy-sunset` (without `--worktree`) finds the project in the worktree
- [ ] `raf plan --resume ahwvrz-legacy-sunset --worktree` also works
- [ ] When project exists in both main repo and worktree, worktree is preferred
- [ ] When project only exists in main repo, main repo resolution still works
- [ ] Ambiguous/not-found errors are reported clearly
- [ ] `npm run build` succeeds
- [ ] `npm test` passes

## Notes
- Reference `runAmendCommand()` (lines 357-456 in plan.ts) for the pattern of worktree resolution — it uses `resolveWorktreeProjectByIdentifier()` and falls back to main repo
- `resolveWorktreeProjectByIdentifier()` is in `src/core/worktree.ts` and handles computing worktree base dir, scanning entries, and matching by identifier
- The existing worktree detection block in `runResumeCommand` (lines 714-741) can be replaced entirely since the new upfront resolution handles this
