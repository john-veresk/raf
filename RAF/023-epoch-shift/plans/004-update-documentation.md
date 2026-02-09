# Task: Update Documentation for New ID System

## Objective
Update CLAUDE.md and README.md to reflect the new epoch-based project ID format.

## Context
After the code changes, the documentation still references the old sequential numbering system (001-999 numeric, a00-zzz base36). All references need to be updated to describe the new 6-character base36 epoch-based IDs.

## Dependencies
001, 002

## Requirements
- Update `CLAUDE.md`:
  - Project Naming Convention section: describe new epoch-based scheme
  - Remove references to NNN (001-999) sequential format
  - Remove references to old base36 (a00-zzz) format
  - Update "Supports 46,000+ projects" — new system supports 69 years of unique IDs
  - Update Project Identifier Resolution section: 6-char ID, project name, full folder name
  - Update example folder names (e.g., `001-fix-bug` → `00abcd-fix-bug`)
  - Update git commit format examples: `RAF[00abcd:001]`
  - Update worktree branch name examples
  - Update RAF Project Structure section with new folder format
- Update `README.md`:
  - Update any user-facing references to project ID format
  - Update example commands and output

## Implementation Steps
1. Read current CLAUDE.md and identify all sections referencing the old ID format
2. Update each section with the new 6-char base36 epoch-based format
3. Read current README.md and update relevant sections
4. Ensure consistency between CLAUDE.md and README.md

## Acceptance Criteria
- [ ] No references to old sequential numbering (001-999) for project IDs in docs
- [ ] No references to old base36 format (a00-zzz) for project IDs in docs
- [ ] New epoch-based scheme clearly documented
- [ ] Examples use realistic 6-char IDs
- [ ] Git commit format examples updated
- [ ] Project resolution formats documented
- [ ] Task IDs within projects still shown as 001, 002 format (unchanged)

## Notes
- Be careful to distinguish between project IDs (changing) and task IDs (staying as 001, 002). Don't accidentally change task ID documentation.
- The prompts in `src/prompts/` also reference project structure — the amend prompt mentions `NNN` for task references which is about task IDs, not project IDs. The planning prompt shows `001-task-name.md` which is also task format. These should NOT be changed.
