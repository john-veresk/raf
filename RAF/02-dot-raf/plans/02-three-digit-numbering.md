# Task: Change to 3-Digit Numbering

## Objective
Update all numbered items in RAF (project folders, plan files, etc.) to use 3-digit prefixes (001, 002, 003) instead of 2-digit (01, 02, 03).

## Context
Currently RAF uses 2-digit numbering (e.g., `01-project-name`, `01-task.md`). Switching to 3-digit numbering allows for up to 999 items and provides better sorting consistency. This change applies to all numbered items throughout RAF.

## Requirements
- Change project folder naming: `RAF/01-xxx` → `RAF/001-xxx`
- Change plan file naming: `01-task.md` → `001-task.md`
- Apply 3-digit format to any other numbered items
- Only apply to new projects (no migration of existing projects)
- Update all code that generates numbered names

## Implementation Steps
1. Find all code that generates numbered prefixes (project folders, plan files)
2. Update number formatting from 2-digit to 3-digit:
   - Change padding from `String(n).padStart(2, '0')` to `String(n).padStart(3, '0')`
   - Or update format strings/templates accordingly
3. Update any regex patterns that match numbered files (e.g., `/^\d{2}-/` → `/^\d{3}-/`)
4. Update documentation and examples to show 3-digit format
5. Update any sorting logic if it depends on prefix format

## Acceptance Criteria
- [ ] New project folders are created as `001-xxx`, `002-xxx`, etc.
- [ ] New plan files are created as `001-task.md`, `002-task.md`, etc.
- [ ] File listing/sorting works correctly with 3-digit prefixes
- [ ] Documentation reflects new naming convention
- [ ] All tests pass

## Notes
- This is a formatting change only - logic for incrementing numbers stays the same
- Be careful with any hardcoded examples in prompts or templates
- Existing 2-digit projects will continue to work (read compatibility should remain)
