# Task: Update Do Command Outcome Handling

## Objective
Modify `do.ts` to use Claude's outcome file instead of overwriting it, with fallback for missing outcomes.

## Context
Currently, `do.ts` always creates outcome files using `extractSummary()` which produces harsh summaries. Claude now writes outcome files directly. RAF should only create outcomes when Claude doesn't.

## Requirements
- Check if outcome file exists after task completion
- If exists and has valid `<promise>COMPLETE</promise>` marker, keep it
- If missing or invalid, create minimal fallback outcome
- Remove `extractSummary()` usage for success cases
- Keep metadata (attempts, elapsed time) - append to existing or include in fallback
- Pass outcome file path to execution prompt

## Implementation Steps
1. Read `src/commands/do.ts`
2. Update success handling (around line 377):
   - After task completes, check if outcome file exists
   - If exists with valid marker, optionally append metadata
   - If missing, create minimal outcome: "Task completed. No detailed report provided.\n\n<promise>COMPLETE</promise>"
3. Calculate outcome file path and pass to `getExecutionPrompt()`
4. Remove or deprecate `extractSummary()` call
5. Update tests in `tests/unit/do-rerun.test.ts` if needed

## Acceptance Criteria
- [ ] Claude's outcome file is preserved (not overwritten)
- [ ] Missing outcomes get minimal fallback with `<promise>COMPLETE</promise>`
- [ ] Outcome file path passed to execution prompt
- [ ] Metadata (attempts, elapsed, timestamp) included somewhere
- [ ] Tests pass

## Notes
- The `extractSummary()` function can be removed or deprecated in separate task
- Metadata could go in a comment block or separate section
- This task depends on Task 001 (execution prompt changes)
