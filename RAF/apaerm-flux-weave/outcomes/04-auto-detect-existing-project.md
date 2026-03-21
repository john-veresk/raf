# Outcome: Auto-Detect Existing Project on `raf plan project-name`

## Summary
When `raf plan project-name` is run (without `--amend`) and a project with that name already exists, the user is now prompted interactively: amend it, create a new project, or cancel. Previously the command would just exit with an error.

## Key Changes

### `src/commands/plan.ts`
- Added `import { select } from '@inquirer/prompts'`
- Removed the old hard-error check (`resolveProjectIdentifier` → exit 1)
- Replaced with a prompt-based flow (in non-auto mode):
  1. Checks main RAF dir with `resolveProjectIdentifierWithDetails`
  2. Falls back to checking worktrees with `resolveWorktreeProjectByIdentifier`
  3. If a match is found, shows a `select` prompt: "Yes, amend it" / "No, create a new project" / "Cancel"
  4. "Yes" → calls `runAmendCommand` with the existing folder name (and `worktreeMode=true` if it's a worktree project)
  5. "Cancel" → `process.exit(0)`
  6. "No" / auto mode → continues with normal project creation
- Removed unused `resolveProjectIdentifier` import

## Acceptance Criteria Verification
- [x] `raf plan my-project` detects existing project named "my-project" and prompts — uses name-based lookup in `resolveProjectIdentifierWithDetails`
- [x] Exact match only — "my" does NOT match "my-project" — name comparison is exact (just case-insensitive)
- [x] Case-insensitive matching — "My-Project" matches "my-project" — both `resolveProjectIdentifierWithDetails` and `resolveWorktreeProjectByIdentifier` use `.toLowerCase()`
- [x] User can choose to amend, create new, or cancel — three choices in the select prompt
- [x] Choosing amend redirects to the amend flow correctly — calls `runAmendCommand(existingFolder, model, autoMode, existingWorktreeMode)`
- [x] Projects in worktrees are also detected — checks `resolveWorktreeProjectByIdentifier` when not found in main
- [x] `raf plan --amend` is not affected — the new check only runs in `runPlanCommand`, not `runAmendCommand`
- [x] All tests pass (1239/1240 — 1 pre-existing failure in name-generator.test.ts unrelated to this change)

<promise>COMPLETE</promise>
