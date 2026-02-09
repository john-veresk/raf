# Outcome: Add `raf migrate-project-ids-base26` CLI Command

## Summary

Added a new CLI command `raf migrate-project-ids-base26` that renames existing project folders from legacy ID formats (3-char base36 or 6-char base36-with-digits) to the new 6-char base26 encoding.

## Key Changes

### Source Files

- **`src/commands/migrate.ts`** (new) — Core migrate command implementation:
  - `detectMigrations(dirPath)` — Scans a directory for legacy project folders and computes rename mappings
  - Detects two legacy patterns: 3-char base36 (`[0-9a-z]{3}-<name>`) and 6-char base36 with digits (`[0-9a-z]{6}-<name>` where prefix contains a digit)
  - Skips already-migrated base26 folders (`[a-z]{6}-`)
  - Collision detection (multiple old IDs mapping to same base26 ID)
  - Existing-target conflict detection
  - `--dry-run` flag for preview without renaming
  - `--worktree` flag to scan worktree RAF directories
  - Summary output showing `oldName -> newName` for each migration
  - Exported `MigrationEntry` interface and `detectMigrations()` for testability

- **`src/index.ts`** — Registered the new command via `program.addCommand(createMigrateCommand())`

- **`src/types/config.ts`** — Added `MigrateCommandOptions` interface with `dryRun` and `worktree` fields

### Test Files

- **`tests/unit/migrate-command.test.ts`** (new) — 15 tests covering:
  - Detection of 3-char base36 legacy folders
  - Detection of 6-char base36 legacy folders with digits
  - Skipping already-migrated base26 folders
  - Skipping non-directory entries and non-existent directories
  - Mixed legacy and migrated folder handling
  - Correct path generation
  - Edge cases (000, zzz prefixes; folders without hyphens; mixed alpha-digit 6-char prefixes)
  - Integration tests for rename execution with content preservation
  - Encoding correctness verification

## Verification

- Build: `npm run build` passes cleanly
- Tests: All 931 tests pass across 45 test suites (15 new tests added)

## Notes

- Branch renaming is out of scope — only folder renames are performed
- Worktree scanning looks for RAF directories inside each worktree subdirectory
- 3-char base36 IDs (e.g., 007=7) map to small base26 values (e.g., "aaaaah")
- 6-char base36 epoch IDs map to larger but valid base26 values

<promise>COMPLETE</promise>
