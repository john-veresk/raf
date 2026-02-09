# Task: Add `raf migrate-project-ids-base26` CLI command

## Objective
Add a CLI command that renames existing project folders from old ID formats (3-char base36 or 6-char base36) to the new 6-char base26 encoding.

## Context
After switching to base26 encoding, existing projects on disk still have old-format IDs. The migrate command provides a clean one-time transition. It must handle two legacy formats: the original 3-char base36 sequential IDs (e.g., "007-project") and the intermediate 6-char base36 epoch IDs (e.g., "021h44-project").

## Dependencies
01

## Requirements
- New CLI command: `raf migrate-project-ids-base26`
- Detects two legacy folder patterns:
  - 3-char base36: `[0-9a-z]{3}-<name>` (e.g., "007-my-project", "01a-feature")
  - 6-char base36 with digits: `[0-9a-z]{6}-<name>` where the prefix contains at least one digit (to distinguish from already-migrated base26 IDs)
- For each legacy folder:
  - Decode the old ID to its numeric value (base36 decode for both 3-char and 6-char formats)
  - Re-encode as 6-char base26
  - Rename the folder on disk
- Handles the RAF directory in the current repo (standard location)
- Also handles worktree RAF directories if `--worktree` flag is specified or auto-detected
- Prints a summary of what was renamed (old name → new name)
- Dry-run mode (`--dry-run`) to preview changes without renaming
- Skips folders that are already in base26 format
- Handles collisions (two old IDs mapping to same base26 ID — unlikely but should error gracefully)

## Implementation Steps
1. Create `src/commands/migrate.ts` with the migrate command handler.
2. Add detection logic for the two legacy patterns (3-char base36 and 6-char base36-with-digits).
3. Implement the rename operation: decode old ID → encode as base26 → rename folder.
4. Add dry-run support.
5. Register the command in `src/index.ts` (or wherever Commander.js commands are registered).
6. Handle edge cases: empty RAF dir, no legacy projects, folder rename failures.
7. Consider worktree directories — if projects live in worktree paths, the migration should find and rename those too.

## Acceptance Criteria
- [ ] `raf migrate-project-ids-base26` renames 3-char base36 project folders to base26
- [ ] `raf migrate-project-ids-base26` renames 6-char base36 project folders to base26
- [ ] Already-base26 folders are skipped
- [ ] `--dry-run` shows planned renames without executing them
- [ ] Summary output shows old → new folder names
- [ ] Command registered and accessible via CLI

## Notes
- 3-char base36 IDs are small numbers (e.g., 7, 23) — they'll produce base26 IDs like "aaaaah", "aaaaax".
- Base36 epoch IDs are large (seconds since 2026-01-01) — they'll produce reasonable base26 IDs.
- Worktree branch names contain the old project ID. Branch renaming is out of scope for this task — just rename the folders.
- The git.ts module extracts project numbers from paths — after migration, these paths will have new prefixes.
