# Task: Remove SUMMARY.md File Generation

## Objective
Remove the SUMMARY.md file generation from the outcomes folder while keeping console summary output intact.

## Context
The project currently generates a SUMMARY.md file in the `outcomes/` directory after task execution completes. The user wants to remove this file generation but keep the console output that shows project execution results.

## Requirements
- Remove SUMMARY.md file generation from `ProjectManager.saveSummary()`
- Keep console summary output in `do.ts` (single project and multi-project summaries)
- Remove the `saveSummary` method or convert it to only handle console output
- Update any tests that expect SUMMARY.md to be created
- Do NOT remove the `printMultiProjectSummary()` console functionality

## Implementation Steps
1. Read `src/core/project-manager.ts` and locate the `saveSummary` method
2. Remove or disable the file writing logic (the `fs.writeFileSync` call for SUMMARY.md)
3. Read `src/commands/do.ts` and verify console summary output is preserved
4. Update any references that call `saveSummary` if needed
5. Run existing tests and update any that fail due to missing SUMMARY.md
6. Verify the console output still works correctly

## Acceptance Criteria
- [ ] SUMMARY.md is no longer created in `outcomes/` directory after task execution
- [ ] Console summary output still displays after single project execution
- [ ] Console summary output still displays for multi-project execution
- [ ] All existing tests pass (or are updated appropriately)
- [ ] No orphaned code referencing SUMMARY.md generation

## Notes
- The `saveSummary` method is called in `executeSingleProject()` in do.ts
- The console output comes from separate code paths - make sure to preserve those
- Consider whether to remove the method entirely or just the file writing portion
