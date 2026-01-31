# Outcome: Add Auto Flag for Plan Mode

## Summary

Added `--auto` / `-y` CLI flag to `raf plan` command to skip Claude's permission prompts during planning sessions. This allows for automated workflows or when users trust Claude's file operations.

## Key Changes

### Modified Files

- **src/commands/plan.ts**:
  - Added `auto?: boolean` to `PlanCommandOptions` interface
  - Added `-y, --auto` option to Commander.js command definition with description "Skip Claude's permission prompts for file operations"
  - Updated `runPlanCommand()` and `runAmendCommand()` to accept `autoMode` parameter
  - Pass `dangerouslySkipPermissions: autoMode` to `claudeRunner.runInteractive()`
  - Added warning log when auto mode is enabled

- **src/core/claude-runner.ts**:
  - Added `dangerouslySkipPermissions?: boolean` to `ClaudeRunnerOptions` interface
  - Updated `runInteractive()` to conditionally add `--dangerously-skip-permissions` flag when option is true
  - Placed the flag after `--model` and before `--append-system-prompt` in the args array

### New Test Files

- **tests/unit/plan-command-auto-flag.test.ts**: 7 tests covering:
  - CLI option parsing for `--auto` and `-y` flags
  - Flag description contains "permission"
  - Flag is a boolean (no required argument)
  - Coexistence with `--amend`, `--model`, and `--sonnet` options

### Updated Test Files

- **tests/unit/claude-runner-interactive.test.ts**: 4 new tests for `--dangerously-skip-permissions`:
  - Should NOT include flag by default
  - Should include flag when option is true
  - Should NOT include flag when option is false
  - Should place flag after `--model` and before `--append-system-prompt`

## Acceptance Criteria Met

- [x] `raf plan --auto` or `raf plan -y` starts planning without permission prompts
- [x] `raf plan --amend <id> --auto` works similarly
- [x] Regular `raf plan` (without flag) still shows permission prompts
- [x] Claude's AskUserQuestion prompts for planning interview still work (not bypassed)
- [x] Help text accurately describes the flag
- [x] All tests pass (638 total, 11 new tests added)

## Usage

```bash
# Skip permission prompts during planning
raf plan --auto
raf plan -y

# With project name
raf plan my-project --auto

# With amend mode
raf plan --amend my-project --auto

# Combined with model selection
raf plan --auto --model sonnet
```

## Notes

- The `-y` shorthand follows common CLI conventions (like `apt -y`, `npm -y`)
- A warning message is logged when the flag is used to remind users that permissions are being skipped
- This flag only affects file operation permissions; Claude can still ask planning interview questions

<promise>COMPLETE</promise>
