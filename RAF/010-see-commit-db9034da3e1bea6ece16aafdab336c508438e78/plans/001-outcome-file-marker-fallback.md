# Task: Outcome File Marker Fallback

## Objective
Fix marker detection in `do.ts` to check the outcome file for completion markers when not found in Claude's terminal output.

## Context
Currently, RAF only checks Claude's terminal output for `<promise>COMPLETE</promise>` markers (via `parseOutput()` in `output-parser.ts`). However, Claude writes the marker to the outcome file, which RAF doesn't check until after determining success/failure. This causes tasks to be incorrectly marked as failed even when Claude successfully completed them and wrote the marker to the outcome file.

See commit `db9034da3e1bea6ece16aafdab336c508438e78e` for an example where the outcome file contains a valid `<promise>COMPLETE</promise>` marker but RAF reported failure.

## Requirements
- Check terminal output first (current behavior via `parseOutput()`)
- If terminal output has no marker (`parsed.result === 'unknown'`), check the outcome file as fallback
- Use existing `parseOutcomeStatus()` function from `state-derivation.ts` to parse outcome file
- Only check outcome file if it exists (use `fs.existsSync()`)
- Handle both COMPLETE and FAILED markers from outcome file

## Implementation Steps

1. In `src/commands/do.ts`, locate the section after `parseOutput(result.output)` call (around line 385)

2. In the conditional block that handles `parsed.result` (lines 400-410), modify the logic:
   - Keep existing checks for `complete` and `failed` results from terminal output
   - In the `else` block (unknown result), add fallback to check outcome file:
     ```typescript
     } else {
       // Unknown result - check outcome file as fallback
       if (fs.existsSync(outcomeFilePath)) {
         const outcomeContent = fs.readFileSync(outcomeFilePath, 'utf-8');
         const outcomeStatus = parseOutcomeStatus(outcomeContent);
         if (outcomeStatus === 'completed') {
           success = true;
         } else if (outcomeStatus === 'failed') {
           failureReason = 'Task failed (from outcome file)';
         } else {
           failureReason = 'No completion marker found in output or outcome file';
         }
       } else {
         failureReason = 'No completion marker found';
       }
     }
     ```

3. Ensure `parseOutcomeStatus` is already imported (it is, on line 27)

4. Run existing tests to verify no regressions: `npm test`

## Acceptance Criteria
- [ ] When Claude writes `<promise>COMPLETE</promise>` to outcome file but not terminal output, task is marked successful
- [ ] When Claude writes `<promise>FAILED</promise>` to outcome file but not terminal output, task is marked failed
- [ ] When marker is in terminal output, behavior is unchanged (terminal takes precedence)
- [ ] When marker is in neither location, task fails with clear message
- [ ] All existing tests pass

## Notes
- The `outcomeFilePath` variable is already computed at line 332
- The `parseOutcomeStatus` function returns `'completed'`, `'failed'`, or `null`
- Keep the terminal output check first for backwards compatibility and to catch markers that appear in Claude's conversational output
