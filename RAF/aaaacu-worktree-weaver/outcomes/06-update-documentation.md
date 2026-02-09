# Outcome: Update Documentation for Worktree Support

## Summary
Updated both README.md (user-facing) and CLAUDE.md (internal developer docs) with comprehensive documentation for the `--worktree` and `--merge` flags.

## Changes Made

### Modified Files
- **`README.md`** - Added worktree documentation in four places:
  - **Features section**: Added "Worktree Mode" bullet describing isolated branch execution
  - **Commands section**: Added `raf plan --worktree` and `raf do --worktree --merge` examples to both plan and do command blocks
  - **Worktree Mode section** (new, after Project Structure): Explains the workflow, worktree path convention, merge behavior, conflict handling, persistence, and single-project limitation
  - **Command Reference tables**: Added `-w, --worktree` row to plan table; added `-w, --worktree` and `--merge` rows to do table

- **`CLAUDE.md`** - Added "Worktree Mode" subsection under "Architectural Decisions" covering:
  - Worktree path convention (`~/.raf/worktrees/<repo-basename>/<project-id>`)
  - Branch naming (matches project folder name)
  - Flag requirement (explicit `--worktree` on both plan and do)
  - Full lifecycle: create -> plan -> execute -> merge
  - Merge strategy details
  - Cleanup behavior (no auto-cleanup except on plan failure)
  - Constraints (`--worktree` single project only, `--merge` requires `--worktree`)
  - Core module reference (`src/core/worktree.ts`)

## Acceptance Criteria Verification
- [x] README.md has `--worktree` and `--merge` in Features, Commands, and Command Reference
- [x] README.md has a "Worktree Mode" section with workflow explanation
- [x] CLAUDE.md has a "Worktree Mode" architectural decision section
- [x] Documentation mentions that worktrees persist (no auto-cleanup)
- [x] Documentation matches the implemented behavior (verified against source code)
- [x] No existing documentation is broken or contradicted

<promise>COMPLETE</promise>
