---
effort: low
---
# Task: Update CLI Help Docs

## Objective
Align user-facing CLI help text and `README.md` with the removal of the `--worktree` and `--no-worktree` flags.

## Context
The user wants the help/docs surface updated to reflect that these flags are removed. In this task, scope is limited to CLI help text and `README.md`; prompt artifacts and archived RAF project docs should not be updated.

## Requirements
- Remove stale references to the removed `--worktree` / `--no-worktree` flags from CLI help text.
- Update `README.md` so supported flags and usage examples match the actual CLI behavior.
- Check for both the typo form `--worktreee` and the real flag names while cleaning up docs.
- Limit documentation changes to CLI help text and `README.md`.

## Implementation Steps
1. Inspect the current command definitions to identify which option declarations still drive stale help output.
2. Remove or update the relevant help text so `raf ... --help` matches the intended flag surface.
3. Update the flag tables and any related usage notes in `README.md`.
4. Verify there are no remaining user-facing references to the removed flags in the scoped files.

## Acceptance Criteria
- [ ] CLI help output no longer lists the removed `--worktree` / `--no-worktree` flags.
- [ ] `README.md` no longer documents the removed flags.
- [ ] No prompt docs or archived `RAF/*` artifacts are changed for this task.
- [ ] All tests pass

## Notes
If removing the help text requires deleting stale Commander option declarations, keep the change tightly scoped to the flag removal.
