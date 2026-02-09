# Task: Update Documentation for Worktree Support

## Objective
Document the `--worktree` and `--merge` flags and worktree workflow in both CLAUDE.md (internal developer docs) and README.md (user-facing docs).

## Context
The worktree feature adds a new workflow to RAF. Users need to know how to use it, and developers maintaining RAF need to understand the architecture. Both docs files need updates.

## Dependencies
002, 003, 004

## Requirements

### README.md updates:
- Add `--worktree` to the Features section (brief mention of isolated branch execution)
- Add worktree usage examples to the Commands section for both `raf plan` and `raf do`
- Add `--worktree` and `--merge` rows to the Command Reference tables for both plan and do
- Add a new "Worktree Mode" section (after the existing "Project Structure" section) explaining:
  - What worktree mode does and why you'd use it (isolated branch for parallel work)
  - The basic workflow: `raf plan my-feature --worktree` -> `raf do my-feature --worktree --merge`
  - Where worktree directories are created (`~/.raf/worktrees/<repo>/<project>`)
  - Merge behavior with `--merge` flag (ff preferred, merge-commit fallback, conflict abort)
  - What happens on failure (branch preserved, user can merge manually)
  - Worktrees persist after completion — no automatic cleanup

### CLAUDE.md updates:
- Add a new "Worktree Mode" subsection under "Architectural Decisions" explaining:
  - Worktree path convention: `~/.raf/worktrees/<repo-basename>/<project-id>`
  - Branch naming: full project folder name (e.g., `020-my-feature`)
  - How worktree mode detection works (--worktree flag required on both plan and do)
  - The lifecycle: create worktree -> plan in worktree -> execute in worktree -> optionally merge with `--merge`
  - Merge strategy: ff preferred, merge-commit fallback, abort on conflicts
  - Worktrees are NOT cleaned up after completion or merge
  - Single project limitation (no multi-project with --worktree)
  - `--merge` only valid with `--worktree`
- Add `--worktree` and `--merge` to the plan and do command descriptions if they exist in CLAUDE.md

## Implementation Steps
1. Read both README.md and CLAUDE.md to understand current structure
2. Add worktree content to README.md in the appropriate sections
3. Add worktree architectural decision to CLAUDE.md
4. Ensure the documentation is consistent with the actual implementation

## Acceptance Criteria
- [ ] README.md has `--worktree` and `--merge` in Features, Commands, and Command Reference
- [ ] README.md has a "Worktree Mode" section with workflow explanation
- [ ] CLAUDE.md has a "Worktree Mode" architectural decision section
- [ ] Documentation mentions that worktrees persist (no auto-cleanup)
- [ ] Documentation matches the implemented behavior
- [ ] No existing documentation is broken or contradicted

## Notes
- Keep documentation concise - match the existing style of both files
- Focus on the user workflow in README.md and the technical architecture in CLAUDE.md
- The worktree path example should use concrete values so it's easy to understand
