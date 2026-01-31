# Outcome: Failure Reason Details in Outcome Files

## Summary

Added a "Failure History" section to outcome files that lists all previous failure attempts with bullet points for each failure reason, showing the journey from failed attempts to eventual success (or final failure).

## Key Changes

### New Files
- **tests/unit/failure-history.test.ts**: Comprehensive tests for the `formatFailureHistory` function (12 tests)

### Modified Files
- **src/commands/do.ts**:
  - Added `formatFailureHistory()` function that formats failure history as a markdown section
  - Added `failureHistory` array to track all failure reasons across retry attempts
  - Updated all failure paths (timeout, context overflow, parsed failure, outcome file failure, no marker) to record failures
  - Integrated failure history into both success and failure outcome generation
  - For success: inserts failure history before `<promise>COMPLETE</promise>` marker
  - For failure: inserts failure history before `<promise>FAILED</promise>` marker

## Features Implemented

1. **Failure tracking**: All failed attempts are recorded with their attempt number and reason
2. **Success tracking**: Final successful attempt is shown when preceded by failures
3. **Clean runs**: No failure history section is added when there are no failures
4. **Proper placement**: Failure history appears before the `<promise>` marker as specified

## Example Output

When task fails twice then succeeds:
```markdown
## Failure History
- **Attempt 1**: Context overflow detected after 45 minutes
- **Attempt 2**: API rate limit exceeded
- **Attempt 3**: Success

<promise>COMPLETE</promise>
```

When task fails all retries:
```markdown
## Failure History
- **Attempt 1**: Task timed out
- **Attempt 2**: Task timed out
- **Attempt 3**: Context overflow - task too large

<promise>FAILED</promise>
```

## Acceptance Criteria Met

- [x] Outcome files include failure history when any attempts failed
- [x] Each failed attempt shows attempt number and short reason
- [x] Successful final attempt also shows in history (if preceded by failures)
- [x] Clean runs (no failures) don't show failure history section
- [x] Failure reasons are concise (1-2 sentences)
- [x] All tests pass (611 total, 12 new for failure history)

<promise>COMPLETE</promise>


## Details
- Attempts: 1
- Elapsed time: 3m 29s
- Completed at: 2026-01-31T14:10:57.686Z
