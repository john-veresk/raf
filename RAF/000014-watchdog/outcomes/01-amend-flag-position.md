# Outcome: Support --amend flag after project identifier

## Summary

Successfully implemented support for both `raf plan <project> --amend` and `raf plan --amend <project>` syntaxes for the amend command.

## Changes Made

### 1. Modified `src/commands/plan.ts`

- Changed `--amend` from a value-taking option (`-a, --amend <identifier>`) to a boolean flag (`-a, --amend`)
- Updated `PlanCommandOptions` interface: changed `amend?: string` to `amend?: boolean`
- Updated action handler to:
  - Use the positional `projectName` argument as the identifier when `--amend` is set
  - Show clear error message if `--amend` is used without a project identifier
  - Error message guides users with both valid syntaxes

### 2. Added `tests/unit/plan-command-amend-flag.test.ts`

New test file covering:
- `--amend` flag acceptance and `-a` shorthand
- Boolean flag verification (no required argument)
- Positional argument availability with `--amend` flag
- Structural support for both syntax variants

## Key Implementation Details

The key insight is that Commander.js handles boolean flags and positional arguments separately:
- When `--amend` takes a `<value>`, it consumes the next argument
- When `--amend` is a boolean flag, the positional argument remains available

Both syntaxes now work because:
- `raf plan myproject --amend` → positional arg = "myproject", amend = true
- `raf plan --amend myproject` → positional arg = "myproject", amend = true

## Acceptance Criteria Verification

- [x] `raf plan myproject --amend` works (opens editor for amendment)
- [x] `raf plan --amend myproject` still works (backward compatibility via positional arg)
- [x] `raf plan --amend` without identifier shows helpful error message
- [x] All existing tests pass (717 tests)
- [x] New tests added for both syntax variants

<promise>COMPLETE</promise>


## Details
- Attempts: 1
- Elapsed time: 2m 5s
- Completed at: 2026-01-31T17:10:51.923Z
