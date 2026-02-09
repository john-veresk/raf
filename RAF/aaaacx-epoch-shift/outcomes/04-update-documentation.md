# Outcome: Update Documentation for New ID System

## Summary

Updated CLAUDE.md and README.md to reflect the new epoch-based 6-character base36 project ID format, replacing all references to the old sequential numbering system.

## Key Changes

### `CLAUDE.md`
- **RAF Project Structure**: Updated folder example from `NNN-project-name/` (e.g., `001-fix-bug or a00-feature`) to `00j3k1-project-name/` with 6-char epoch-based base36 ID
- **Project Naming Convention**: Replaced old format description (`NNN` 001-999, then `XXX` a00-zzz, "46,000+ projects") with epoch-based scheme (`XXXXXX` 6-char base36, generated from Unix timestamp minus RAF_EPOCH, unique by timestamp, sorts chronologically)
- **Project Identifier Resolution**: Simplified from 4 formats (numeric, base36, name, folder) to 3 formats (base36 ID, name, full folder name) with updated examples
- **Git Commit Schema**: Updated examples from `RAF[005:001]`, `RAF[a01:003]` to `RAF[00j3k1:001]`, `RAF[00k5m2:003]`
- **Worktree Mode**: Updated worktree path and branch name examples from `020-my-feature` to `00j3k1-my-feature`

### `README.md`
- Updated `raf plan --amend` example from `3` to `00j3k1`
- Updated `raf do` example from `3` (project #3) to `00j3k1` (by project ID)
- Updated `raf status` example from `3` (project #3) to `00j3k1`
- Updated Project Structure section: folder examples from `001-auth-system/`, `002-dashboard/` to `00j3k1-auth-system/`, `00k5m2-dashboard/`; description changed from "numbered project directories" to "project directories identified by epoch-based base36 IDs"
- Updated worktree branch name example from `020-my-feature` to `00j3k1-my-feature`

## Verification

- No references to old sequential numbering (001-999) for project IDs remain in docs
- No references to old base36 format (a00-zzz) for project IDs remain in docs
- Task-level IDs (001, 002, etc.) correctly preserved throughout both files
- All examples use consistent 6-char base36 IDs

<promise>COMPLETE</promise>
