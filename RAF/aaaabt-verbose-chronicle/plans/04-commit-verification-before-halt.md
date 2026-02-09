# Task: Commit Verification Before Halt

## Objective
Before halting Claude after detecting a completion marker, verify that the expected git commit has actually been made, extending the grace period if the commit hasn't landed yet.

## Context
The current halt mechanism in `claude-runner.ts` detects completion markers (`<promise>COMPLETE/FAILED</promise>`) and starts a fixed 60-second grace period before killing Claude. However, if Claude hasn't finished its git commit within that window, the process gets killed mid-commit, potentially leaving the repository in a broken state. The previous halt work was introduced in commit `4d3868c`. This task adds commit verification to ensure the grace period only expires after the commit is confirmed.

See previous halt work: commit `4d3868c3ef4c607c59829e94462ffd0490d82a98`

## Dependencies
003

## Requirements
- Record the HEAD commit hash before task execution begins
- After the grace period triggers, verify the commit landed by checking ALL three conditions:
  1. HEAD has changed from the pre-execution hash
  2. The new HEAD commit message starts with the expected `RAF[project:task]` pattern
  3. The outcome file is tracked in git (committed, not just on disk)
- If the commit hasn't landed when the initial grace period (60s) expires:
  - Extend the grace period by polling for the commit
  - Continue extending until either the commit is confirmed or a hard maximum of 180 seconds is reached
  - Poll at a reasonable interval (e.g., every 10 seconds)
- If the hard maximum is reached without commit confirmation, kill the process and log a warning
- Add git helper functions to `src/core/git.ts` for:
  - Getting the current HEAD hash
  - Checking if a commit message matches a pattern
  - Checking if a file is committed in HEAD
- The completion detector factory (`createCompletionDetector`) needs additional parameters:
  - Pre-execution HEAD hash
  - Expected commit message prefix (e.g., `RAF[005:001]`)
  - Outcome file path (already available)
- Pass the necessary context from `do.ts` when creating the completion detector

## Implementation Steps
1. Add new git utility functions to `src/core/git.ts`:
   - `getHeadCommitHash()`: returns current HEAD hash
   - `getHeadCommitMessage()`: returns HEAD commit message
   - `isFileCommittedInHead(filePath)`: checks if file is in HEAD commit
2. Update `createCompletionDetector` in `claude-runner.ts` to accept commit verification parameters
3. Modify the grace period logic: instead of a single `setTimeout`, use an interval that checks for the commit
4. If initial 60s grace period expires without commit, continue polling up to 180s total
5. Update `do.ts` to capture HEAD hash before task execution and pass commit context to the runner
6. Add unit tests for the new git functions
7. Add unit tests for the extended grace period behavior

## Acceptance Criteria
- [ ] HEAD hash is recorded before each task execution
- [ ] Grace period checks for commit matching `RAF[project:task]` pattern
- [ ] Grace period checks that outcome file is committed
- [ ] Grace period extends up to 180 seconds if commit not found
- [ ] Process is killed with a warning after 180 seconds if commit never lands
- [ ] Normal flow (commit lands within 60s) is not affected
- [ ] All existing tests pass
- [ ] New tests cover: commit found within grace, commit found in extended grace, commit never found (hard timeout)

## Notes
- The `ClaudeRunnerOptions` interface may need new fields for the commit context
- On task failure, Claude does NOT commit (changes are stashed) — the commit check should only apply when a COMPLETE marker is detected, not FAILED
- The project number and task ID are already available in `do.ts` where the runner is called
- Use `execSync` for git commands (consistent with existing `git.ts` functions)
- Handle "not in git repo" gracefully — skip commit verification if not in a git repo
