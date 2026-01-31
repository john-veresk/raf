# Task: Fix Double Summary Headers in Outcomes

## Objective
Remove the duplicate "## Summary" header that appears in outcome files by eliminating RAF's programmatic header.

## Context
When RAF generates outcome files, it adds its own `## Summary` header in the template (do.ts:373). However, Claude's output often already contains a `## Summary` header from its response. This results in duplicate headers like:

```markdown
## Summary
All tests pass and build succeeds.
## Summary
Task 003 has been completed successfully...
```

The user decided to remove RAF's template header and let Claude's header stand.

## Requirements
- Remove the `## Summary` line from the outcome template in `src/commands/do.ts`
- Ensure the extracted summary content from Claude is still properly included
- Maintain the overall outcome file structure (Status, Task header, Details section)
- Write tests to verify the fix

## Implementation Steps
1. Read `src/commands/do.ts` and locate the outcome template (around line 366-380)
2. Remove the `## Summary` line from the `outcomeContent` template string
3. Update any related tests in the test files
4. Add a new test case to verify outcomes don't have duplicate Summary headers
5. Run the test suite to confirm all tests pass
6. Build the project to verify compilation succeeds

## Acceptance Criteria
- [ ] The `## Summary` line is removed from the outcome template in do.ts
- [ ] Outcome files now contain only one `## Summary` header (from Claude's output)
- [ ] All existing tests continue to pass
- [ ] New test verifies no duplicate Summary headers
- [ ] Build succeeds without errors

## Notes
- The `extractSummary()` function in `output-parser.ts` should remain unchanged
- Claude's responses typically include their own `## Summary` header, so removing RAF's is the cleaner solution
- Check existing outcome files in `RAF/*/outcomes/` for examples of the current duplicate header issue
