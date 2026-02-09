# Task: Enhance Identifier Resolution for Full Folder Names

## Objective
Extend the `resolveProjectIdentifier` function to support full folder names like `001-fix-stuff` or `a01-important-project` in addition to the existing number, base36, and name formats.

## Context
Currently `resolveProjectIdentifier()` in `src/utils/paths.ts` supports:
- Numeric IDs: `3`, `003`
- Base36 IDs: `a00`, `a01`
- Project names: `fix-stuff`

Users want to copy-paste full folder names directly from file explorers or terminal output. This enhancement is the foundation for consistent identifier support across all RAF commands.

## Requirements
- Support full folder name format: `NNN-project-name` or `XXX-project-name` (base36)
- Extract the prefix and use existing resolution logic
- Design the function to be extensible for future task-level references like `001-project/002-task`
- Maintain backward compatibility with all existing identifier formats
- All commands (`raf do`, `raf status`, `raf plan`) will share this enhanced resolution

## Implementation Steps
1. Read and understand the current `resolveProjectIdentifier()` function in `src/utils/paths.ts`
2. Add a new identifier type detection for full folder names:
   - Pattern: `^(\d{2,3}|[a-z][0-9a-z]{2})-(.+)$` to match `NNN-name` or `XXX-name`
   - Extract prefix and validate it matches existing project
3. Update the resolution logic order:
   - Check if identifier is a full folder name first
   - Then fall through to existing checks (numeric, base36, name)
4. Add unit tests for the new identifier format:
   - Test `001-fix-stuff` resolves correctly
   - Test `a01-important-project` resolves correctly
   - Test partial matches don't accidentally match (e.g., `001-wrong-name` should fail if folder is `001-correct-name`)
5. Document the supported identifier formats in code comments

## Acceptance Criteria
- [ ] `resolveProjectIdentifier('001-fix-stuff')` returns the correct project path
- [ ] `resolveProjectIdentifier('a01-important-project')` returns the correct project path
- [ ] Invalid full folder names (wrong prefix or name) return appropriate errors
- [ ] All existing identifier formats continue to work
- [ ] Unit tests cover the new functionality
- [ ] Function design allows for future task-level reference extension

## Notes
- The full folder name should be an exact match, not a partial match
- Consider edge cases where the name portion contains hyphens (e.g., `001-my-cool-project`)
- This task must be completed before tasks 002 and 003 can proceed
