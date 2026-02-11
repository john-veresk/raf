# Task: Add --no-session-persistence to Throwaway Claude Calls

## Objective
Prevent PR body generation and failure analysis Claude calls from polluting the user's session history.

## Context
Claude CLI saves every session to disk by default, making them appear in `claude --resume`. Throwaway utility calls (PR body generation, failure analysis) clutter this history with sessions the user will never want to resume. The name generation utility already solved this by adding `--no-session-persistence` to its `spawn()` call (implemented in the token-reaper project). The same pattern should be applied to the remaining throwaway Claude invocations.

## Requirements
- Add `--no-session-persistence` flag to the `spawn()` call in `callClaudeForPrBody()` in `src/core/pull-request.ts`
- Add `--no-session-persistence` flag to the `spawn()` call in the failure analyzer in `src/core/failure-analyzer.ts`
- Both already use `-p` (print mode), which is required for `--no-session-persistence` to work
- Follow the exact same pattern used in `src/utils/name-generator.ts`

## Implementation Steps
1. In `src/core/pull-request.ts`, add `'--no-session-persistence'` to the args array in `callClaudeForPrBody()`
2. In `src/core/failure-analyzer.ts`, add `'--no-session-persistence'` to the args array in the Claude spawn call
3. Verify both functions still work correctly — the flag should be transparent to the output

## Acceptance Criteria
- [ ] PR body generation sessions don't appear in `claude --resume`
- [ ] Failure analysis sessions don't appear in `claude --resume`
- [ ] Both features still function correctly (output unchanged)
- [ ] Pattern matches the existing implementation in `name-generator.ts`

## Notes
- This is a minimal two-line change (one per file). The flag is well-tested in name-generator.ts already.
- The `--no-session-persistence` flag only works with `-p` (print mode), which both call sites already use.
