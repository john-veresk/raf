# Task: Update All Pattern Matching and Resolution for 6-Char IDs

## Objective
Update every regex pattern, folder matching function, and identifier resolution function across the codebase to recognize the new 6-character base36 project ID format.

## Context
After task 001 changes the ID generation, the rest of the codebase still has regex patterns like `/^(\d{2,3})-/` and `/^([a-z][0-9a-z]{2})-/` that match the old format. These must all be updated to match the new 6-char alphanumeric format (e.g., `00j3k1-project-name`). This is a clean break, so old patterns should be removed entirely.

## Dependencies
001

## Requirements
- New project folder pattern: `/^([0-9a-z]{6})-(.+)$/` (6 lowercase alphanumeric chars, hyphen, name)
- Update all functions in `src/utils/paths.ts` that parse folder names:
  - `extractProjectNumber()` — match 6-char prefix
  - `extractProjectName()` — match 6-char prefix, return name after hyphen
  - `extractTaskNameFromPlanFile()` — this uses task IDs (3-digit like `001`), leave as-is since task numbering within a project hasn't changed
  - `parseProjectPrefix()` — parse 6-char base36 string
  - `getProjectDir()` — match 6-char prefix pattern
  - `listProjects()` — match 6-char prefix pattern
  - `parseProjectFolder()` — match 6-char prefix pattern
  - `resolveProjectIdentifierWithDetails()` — update the full folder pattern regex, update identifier detection (no more separate numeric vs base36 paths — all IDs are 6-char base36)
- Update `src/core/state-derivation.ts`:
  - `discoverProjects()` — currently only matches `/^(\d{2,3})-/`, must match new 6-char format
  - `parseDependencies()` — this is about task IDs (like `001`), not project IDs, so leave as-is
  - Outcome file matching in `deriveProjectState()` — these use task IDs (`/^(\d{2,3})-/` for tasks), leave as-is
  - Plan file matching in `deriveProjectState()` — same, task IDs, leave as-is
- Update `src/core/project-manager.ts`:
  - `readOutcomes()` — uses `/^(\d{2,3})-/` to match task outcomes, this is task ID format, leave as-is
- Update `src/utils/validation.ts`:
  - `validateProjectExists()` — update folder matching patterns
- Update `src/commands/plan.ts`:
  - Any regex matching existing plan files (line ~582: `/^(\d{2,3})-/`) — this is for task files, leave as-is
- Update `src/commands/status.ts` and `src/commands/do.ts` — these use `extractProjectNumber()` and `extractProjectName()` which will be updated via paths.ts, but check for any inline regex patterns
- Update identifier resolution to support:
  - Full 6-char ID: `00j3k1` → look up by decoded number
  - Full folder name: `00j3k1-epoch-shift` → exact match
  - Project name: `epoch-shift` → name match (case-insensitive)
  - Remove old numeric-only (`3`, `003`) and old 3-char base36 (`a00`) resolution paths

## Implementation Steps
1. Update all regex patterns in `src/utils/paths.ts` from old numeric/base36 dual patterns to single 6-char pattern
2. Simplify `resolveProjectIdentifierWithDetails()` — all IDs are now 6-char base36, so the numeric vs base36 branching can be unified
3. Update `discoverProjects()` in `src/core/state-derivation.ts` to match 6-char prefix
4. Update `validateProjectExists()` in `src/utils/validation.ts`
5. Verify that task-level patterns (3-digit IDs like `001`) are untouched
6. Verify commands (`do.ts`, `status.ts`, `plan.ts`) work with updated utility functions

## Acceptance Criteria
- [ ] All project folder patterns match `[0-9a-z]{6}-name` format
- [ ] Task-level patterns (`001`, `002`) remain unchanged
- [ ] `resolveProjectIdentifierWithDetails()` resolves 6-char IDs and project names
- [ ] `discoverProjects()` finds projects with new ID format
- [ ] `validateProjectExists()` works with new format
- [ ] No old numeric-only or 3-char base36 patterns remain for project IDs
- [ ] TypeScript compiles with no errors

## Notes
- Be careful to distinguish between PROJECT IDs (changing to 6-char) and TASK IDs within a project (staying as 3-digit `001`, `002`, etc.). Only project-level patterns change.
- The `number` field in project interfaces remains a `number` type — it just holds a larger value now (the shifted timestamp).
