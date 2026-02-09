# Outcome: Define Dependency Syntax in Plan Files

## Summary

Established the syntax and location for specifying task dependencies in plan markdown files. This is the foundational task for the dependencies watchdog feature.

## Key Changes

### 1. Updated Planning Prompt (`src/prompts/planning.ts`)
- Added `## Dependencies` section to the plan file template structure
- Section is optional and should be omitted if task has no dependencies
- Format: comma-separated task IDs (e.g., "001, 002")
- Includes clear instruction that dependent tasks are blocked if a dependency fails
- Updated Important Rules to include dependency specification guidelines

### 2. Updated Amend Prompt (`src/prompts/amend.ts`)
- Added `## Dependencies` section to the plan file template structure
- Added instruction to check existing plan files for dependencies when analyzing new requirements
- Updated Important Rules to include dependency specification guidelines

### 3. Updated CLAUDE.md Documentation
- Added new "Plan File Structure" subsection under "RAF Project Structure"
- Documents the complete plan file format including the optional Dependencies section
- Explains the format and behavior of dependencies (task IDs, blocking on failure)

## Dependency Syntax Specification

```markdown
## Dependencies
001, 002
```

- **Location**: After `## Context`, before `## Requirements`
- **Format**: Comma-separated list of task IDs (e.g., "001, 002")
- **Optional**: Omit entirely if task has no dependencies
- **Behavior**: If a dependency fails, dependent tasks are automatically blocked

## Files Modified

- `src/prompts/planning.ts` - Planning prompt template
- `src/prompts/amend.ts` - Amendment prompt template
- `CLAUDE.md` - Project documentation

## Notes

- This task only defines the syntax; parsing is handled in task 003
- All tests pass (638/638)
- TypeScript build succeeds with no errors

<promise>COMPLETE</promise>


## Details
- Attempts: 1
- Elapsed time: 2m 15s
- Completed at: 2026-01-31T16:35:37.298Z
