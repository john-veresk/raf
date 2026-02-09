# Task: Change Task IDs to 2-Character Base36 Format

## Objective
Replace the current 3-digit decimal task IDs (001, 002, ..., 999) with 2-character base36 IDs (01, 02, ..., 09, 0a, 0b, ..., 0z, 10, ..., zz) supporting up to 1296 tasks per project.

## Context
The project already uses base36 encoding for project IDs (6-char epoch-based). This change extends the same encoding philosophy to task IDs, making them shorter and consistent. This is a breaking change — no backward compatibility with old 3-digit decimal IDs is needed.

## Requirements
- Task IDs become 2-character base36, zero-padded (e.g., `01`, `0a`, `1z`, `zz`)
- All file naming uses this format: `01-task-name.md`, `0a-task-name.md`, etc.
- All regex patterns that match task IDs must be updated from `\d{2,3}` to a base36-aware pattern
- Git commit format updates: `RAF[NNN:01]` instead of `RAF[NNN:001]`
- Plan file dependencies section uses new format: `01, 02` instead of `001, 002`
- State derivation, task parsing, and all consumers of task IDs must be updated
- The encoding should reuse or mirror the existing base36 utilities in `src/utils/paths.ts`

## Implementation Steps
1. Add task ID encoding/decoding utilities — convert between numeric index and 2-char base36 string (reuse `encodeBase36`/`decodeBase36` pattern from paths.ts, but with width=2)
2. Update plan file naming: change all references from 3-digit to 2-char base36 format
3. Update task ID extraction regex throughout the codebase — search for patterns like `/^\d{2,3}-/`, `/^(\d{2,3})-/`, `\d{3}` and replace with base36-aware patterns
4. Update `state-derivation.ts` — task ID parsing, dependency parsing, sorting logic
5. Update `plan.ts` — next task number calculation, plan file creation, amend task numbering
6. Update `do.ts` — task ID display, commit message formatting
7. Update prompt templates — any system prompts that reference task ID format
8. Update all test fixtures and test expectations to use new format
9. Update CLAUDE.md documentation for the new task ID format

## Acceptance Criteria
- [ ] Task IDs use 2-character base36 format everywhere
- [ ] Plan files created as `01-task-name.md`, `02-task-name.md`, etc.
- [ ] State derivation correctly parses new task ID format
- [ ] Dependencies section uses new format
- [ ] Git commit messages use new format: `RAF[NNN:01]`
- [ ] All existing tests updated and passing
- [ ] CLAUDE.md updated with new task ID format documentation

## Notes
- Base36 charset: 0-9, a-z (lowercase)
- 2-char base36 supports 00-zz = 1296 values (more than enough)
- Sort order: 00, 01, ..., 09, 0a, 0b, ..., 0z, 10, 11, ..., zz
- Task numbering still starts at 01 (not 00)
- Key files to modify: `src/utils/paths.ts`, `src/core/state-derivation.ts`, `src/commands/plan.ts`, `src/commands/do.ts`, `src/prompts/` (system prompts), test files
