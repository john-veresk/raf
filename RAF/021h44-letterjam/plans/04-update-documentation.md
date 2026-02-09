# Task: Update documentation for base26 project IDs

## Objective
Update CLAUDE.md and README.md to document the new base26 project ID encoding scheme and the migrate command.

## Context
After tasks 01-03, the codebase uses base26 for project IDs, but documentation still references base36. All developer-facing docs need updating.

## Dependencies
01, 03

## Requirements
- Update CLAUDE.md sections that reference base36 project IDs:
  - "Project Naming Convention" section
  - "Task ID Format" section (clarify task IDs remain base36)
  - "Git Commit Schema" section (examples use old IDs)
  - "RAF Project Structure" section (example folder names)
  - Any other mentions of "base36" in the context of project IDs
- Update README.md if it references project ID format
- Document the `raf migrate-project-ids-base26` command in the appropriate section
- All example project IDs in docs should use base26 format

## Implementation Steps
1. Search CLAUDE.md for all occurrences of "base36" related to project IDs and update to "base26".
2. Update example project folder names throughout (e.g., "00j3k1-project-name" → a valid base26 example).
3. Add documentation for the `raf migrate-project-ids-base26` command.
4. Update README.md with any project ID format references.
5. Ensure task ID documentation still correctly says base36.

## Acceptance Criteria
- [ ] CLAUDE.md accurately describes base26 project ID encoding
- [ ] All example IDs in docs are valid base26 (a-z only, 6 chars)
- [ ] `raf migrate-project-ids-base26` command is documented
- [ ] Task ID docs correctly unchanged (still base36)
- [ ] No stale references to base36 for project IDs remain in docs

## Notes
- Be precise about which IDs changed (project = base26) vs stayed (task = base36).
- The encoding details matter: a=0, z=25, padded with 'a', 6 chars.
