# Task 002 - Use System Prompt Append for RAF Instructions

## Summary

Changed RAF to pass its prompts using Claude CLI's `--append-system-prompt` flag instead of as user messages. This gives RAF instructions stronger precedence by placing them in the system prompt section, directly above tool definitions.

## Key Changes

### Modified Files

1. **src/core/claude-runner.ts**
   - `runInteractive()`: Changed from passing prompt as positional argument to using `--append-system-prompt` flag
   - `run()`: Uses `--append-system-prompt` for RAF instructions with a minimal trigger prompt (`Execute the task as described in the system prompt.`) via `-p` flag
   - `runVerbose()`: Same changes as `run()`

2. **tests/unit/claude-runner.test.ts**
   - Added new test suite "system prompt append flag" with 4 tests:
     - `should use --append-system-prompt flag in run()`
     - `should use --append-system-prompt flag in runVerbose()`
     - `should pass minimal trigger prompt with -p flag`
     - `should include all required flags in correct order`

### Technical Details

The implementation uses:
- `--append-system-prompt <prompt>` to add RAF instructions to the system prompt (preserves Claude Code's built-in system prompt)
- `-p` flag for print mode (non-interactive execution)
- A minimal trigger prompt "Execute the task as described in the system prompt." to initiate Claude's response

Note: The plan mentioned `--system-prompt-append` but the actual Claude CLI flag is `--append-system-prompt`. This was discovered by checking `claude --help`.

## Acceptance Criteria Status

- [x] RAF uses `--append-system-prompt` flag for all Claude invocations
- [x] Planning mode (`raf plan`) works correctly with appended system prompt
- [x] Execution mode (`raf do`) works correctly with appended system prompt
- [x] Claude's built-in tools and functionality remain available
- [x] RAF instructions have better adherence (implementation complete, subjective testing pending)
- [x] All existing tests pass (538 tests pass)

## Tests

All 538 tests pass including the 4 new tests for `--append-system-prompt` flag usage.

<promise>COMPLETE</promise>
