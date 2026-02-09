# Outcome: Update Execution Prompt for Commit Workflow

## Summary

Updated Claude's execution prompt to clearly instruct it to commit code changes and outcome file together when a task succeeds, and to NOT commit when a task fails (preserving changes for debugging).

## Key Changes

### Modified Files

- **src/prompts/execution.ts**:
  - Added failure commit instruction in the Git Instructions section: "On Failure: do NOT commit. Just write the outcome file with the `<promise>FAILED</promise>` marker and stop. Uncommitted changes will be preserved for debugging."
  - Added two new Important Rules (7 and 8):
    - Rule 7: "On SUCCESS: Commit code changes AND outcome file together BEFORE you finish"
    - Rule 8: "On FAILURE: Do NOT commit - just write the outcome file with FAILED marker"

- **tests/unit/execution-prompt.test.ts**:
  - Added test: "should include instruction not to commit on failure"
  - Added test: "should not include failure commit instruction when autoCommit is false"
  - Added new test suite "Commit Workflow Rules" with 3 tests:
    - "should include rule to commit code and outcome together on success"
    - "should include rule not to commit on failure"
    - "should specify that changes are preserved for debugging on failure"

## Acceptance Criteria Met

- [x] Execution prompt includes commit instructions (with failure handling)
- [x] Outcome file path is explicitly provided (already present)
- [x] Commit message format is specified: `RAF[NNN:task] description` (already present)
- [x] Instructions specify: write outcome → commit → marker appears
- [x] Failed tasks: write outcome with FAILED marker, no commit
- [x] Claude commits code + outcome in single commit during execution
- [x] All tests pass (605 total, 5 new tests added)

## Notes

The prompt already had the outcome file path and commit message format. The main additions were:
1. Clear instruction about not committing on failure
2. Important Rules 7 and 8 that explicitly state the commit workflow for success/failure cases

<promise>COMPLETE</promise>


## Details
- Attempts: 1
- Elapsed time: 2m 24s
- Completed at: 2026-01-31T14:16:17.299Z
