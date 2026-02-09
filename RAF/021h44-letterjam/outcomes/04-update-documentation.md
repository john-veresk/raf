# Outcome: Update Documentation for Base26 Project IDs

## Summary

Updated CLAUDE.md and README.md to reflect the base26 project ID encoding and document the new `raf migrate-project-ids-base26` command.

## Key Changes

### CLAUDE.md
- **RAF Project Structure**: Changed example folder from `00j3k1-project-name` (base36) to `abcdef-project-name` (base26), updated comment
- **Project Naming Convention**: Updated encoding description from base36 to base26, documented `a=0, b=1, ..., z=25` scheme, noted left-padding with 'a', added note about visual distinction from task IDs
- **Project Identifier Resolution**: Updated examples from `00j3k1` to `abcdef`, changed "Base36 ID" to "Base26 ID"
- **Git Commit Schema**: Updated example project IDs from `00j3k1`/`00k5m2` to `abcdef`/`abaaba`
- **Worktree Mode**: Updated example paths and branch names from `00j3k1-my-feature` to `abcdef-my-feature`
- **Migration Command** (new section): Documented `raf migrate-project-ids-base26` with its options, legacy pattern detection, and implementation location

### README.md
- **Project Structure**: Changed description from "base36 IDs" to "base26 IDs (a-z only)", updated example folders from `00j3k1-auth-system`/`00k5m2-dashboard` to `abcdef-auth-system`/`abaaba-dashboard`
- **Commands section**: Added `raf migrate-project-ids-base26` with usage examples
- **Command Reference**: Added option table for migrate command (`--dry-run`, `--worktree`)
- **All examples**: Replaced all `00j3k1` occurrences with `abcdef` (plan, do, status commands)
- **Worktree section**: Updated branch name example to `abcdef-my-feature`

## Verification
- All remaining "base36" references in docs correctly refer to task IDs (which remain base36) or legacy formats in the migration command docs
- No digit-containing project ID examples remain (except in migration command docs showing legacy formats)
- Task ID documentation unchanged (correctly remains base36)

<promise>COMPLETE</promise>
