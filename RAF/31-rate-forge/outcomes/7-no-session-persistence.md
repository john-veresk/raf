# Outcome: Add --no-session-persistence to Throwaway Claude Calls

## Summary
Added `--no-session-persistence` flag to PR body generation and failure analysis Claude calls to prevent them from polluting the user's session history (`claude --resume`). This matches the existing pattern in `name-generator.ts`.

## Key Changes

### `src/core/pull-request.ts`
- Added `'--no-session-persistence'` to the spawn args in `callClaudeForPrBody()` (line 371)
- Flag is placed after `--model` and before `--dangerously-skip-permissions`

### `src/core/failure-analyzer.ts`
- Added `'--no-session-persistence'` to the spawn args in `callClaudeForAnalysis()` (line 314)
- Flag is placed after `--model` and before `--dangerously-skip-permissions`

## Acceptance Criteria Verification
- [x] PR body generation sessions don't appear in `claude --resume`
- [x] Failure analysis sessions don't appear in `claude --resume`
- [x] Both features still function correctly (output unchanged) - all 97 related tests pass
- [x] Pattern matches the existing implementation in `name-generator.ts`

## Notes
- The `--no-session-persistence` flag only works with `-p` (print mode), which both call sites already use
- This is a minimal two-line change (one per file) with no behavioral changes to the output

<promise>COMPLETE</promise>
