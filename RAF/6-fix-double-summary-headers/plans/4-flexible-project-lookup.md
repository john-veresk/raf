# Task: Flexible Project Lookup

## Objective
Enable `raf do` and `raf plan` commands to accept project identifiers in multiple formats: ID only, name only, or ID-name combined.

## Context
Currently, running `raf do fix-double-summary-headers` fails with "Project not found" because the command only accepts project IDs (e.g., "006"). Users should be able to reference projects by their name for convenience.

## Requirements
- Accept three input formats:
  1. ID only: `raf do 006`
  2. Name only: `raf do fix-double-summary-headers`
  3. ID-name: `raf do 006-fix-double-summary-headers`
- Project name matching must be exact (no partial/fuzzy matching)
- Matching is case-insensitive ('Fix-Double' matches 'fix-double-summary-headers')
- If multiple projects have the same name, show an error listing all matching projects and require the user to specify the ID

## Implementation Steps
1. Locate the project lookup logic (likely in `src/commands/do.ts` and `src/commands/plan.ts` or a shared utility)
2. Create a utility function `findProject(identifier: string)` that:
   - First, try to parse as ID (numeric prefix like "006")
   - If ID-name format, extract and validate both parts
   - If name only, search all projects for exact name match (case-insensitive)
3. Handle ambiguity: if multiple projects match by name, throw an error with a helpful message listing all matches
4. Update both `raf do` and `raf plan` commands to use this shared lookup function
5. Add unit tests for all input formats and edge cases

## Acceptance Criteria
- [ ] `raf do 006` works (existing behavior preserved)
- [ ] `raf do fix-double-summary-headers` finds project 006-fix-double-summary-headers
- [ ] `raf do 006-fix-double-summary-headers` works
- [ ] `raf plan my-project` finds project by name
- [ ] Case-insensitive matching works (e.g., `raf do Fix-Double-Summary-Headers`)
- [ ] Ambiguous names show clear error with all matching project IDs
- [ ] All existing tests pass
- [ ] New unit tests cover all lookup scenarios

## Notes
- The lookup function should be in a shared utility to avoid code duplication between commands
- Error messages should be user-friendly and suggest how to resolve ambiguity
