---
effort: low
---
# Task: Remove `raf migrate-project-ids-base26` command

## Objective
Remove the legacy migration command and all associated code, tests, types, and documentation.

## Context
The `migrate-project-ids-base26` command was a one-time migration utility for renaming legacy project folders (3-char base36 or 6-char base36 with digits) to the current 6-char base26 format. The migration period is over and the command is no longer needed.

## Requirements
- Remove the command implementation entirely
- Remove associated types
- Remove test file
- Clean up command registration
- Update README.md to remove command documentation
- Check CLAUDE.md for any references and remove them
- Shared utilities (`encodeBase26`, `getRafDir`, etc.) must NOT be removed — they are used elsewhere

## Implementation Steps

1. **Delete the command implementation file**
   - Delete `src/commands/migrate.ts` (entire file)

2. **Remove command registration from CLI entry point**
   - In `src/index.ts`, remove the import: `import { createMigrateCommand } from './commands/migrate.js';` (line 7)
   - In `src/index.ts`, remove the registration: `program.addCommand(createMigrateCommand());` (line 21)

3. **Remove the type definition**
   - In `src/types/config.ts`, remove the `MigrateCommandOptions` interface (lines 141-144):
     ```typescript
     export interface MigrateCommandOptions {
       dryRun?: boolean;
       worktree?: boolean;
     }
     ```

4. **Delete the test file**
   - Delete `tests/unit/migrate-command.test.ts` (entire file)

5. **Update README.md**
   - Remove the `### raf migrate-project-ids-base26` section (lines ~120-128) including the heading, description, and usage examples
   - Remove the migrate command options table (lines ~223-228)

6. **Check CLAUDE.md for references**
   - Search for any mentions of `migrate` in CLAUDE.md and remove them if they refer to this command

7. **Verify the build compiles and tests pass**
   - Run `npm run build` to ensure no broken imports
   - Run `npm test` to ensure all remaining tests pass

## Acceptance Criteria
- [ ] `src/commands/migrate.ts` is deleted
- [ ] `tests/unit/migrate-command.test.ts` is deleted
- [ ] No imports or references to `migrate` in `src/index.ts`
- [ ] `MigrateCommandOptions` removed from `src/types/config.ts`
- [ ] README.md has no mentions of `migrate-project-ids-base26`
- [ ] CLAUDE.md has no stale references to the migrate command
- [ ] `npm run build` succeeds
- [ ] `npm test` passes with no failures

## Notes
- This is a pure removal task — no new code needs to be written.
- The old RAF project `ahnbcu-letterjam` contains historical plan/outcome files for the migrate command. These are archival and should NOT be touched.
