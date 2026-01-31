# Outcome: Add Exit Instructions After Planning

## Summary

Added clear exit instructions to both planning and amendment prompts. After Claude completes plan creation, users now see a message explaining how to exit the Claude session (Ctrl-C twice) and how to run their tasks.

## Key Changes

### 1. Updated Planning Prompt (`src/prompts/planning.ts`)

Updated Step 5: Confirm Completion to include:
- Summary of created tasks (existing)
- Exit message with Ctrl-C instructions and `raf do <project>` command

### 2. Updated Amendment Prompt (`src/prompts/amend.ts`)

Updated Step 5: Confirm Completion to include:
- Summary of new tasks, relationships, and total count (existing)
- Exit message with Ctrl-C instructions and `raf do <project>` command

## Exit Message Format

```
Planning complete! To exit this session and run your tasks:
  1. Press Ctrl-C twice to exit
  2. Then run: raf do <project>
```

## Files Modified

- `src/prompts/planning.ts` - Added exit instructions to Step 5
- `src/prompts/amend.ts` - Added exit instructions to Step 5

## Acceptance Criteria Verification

- [x] After `raf plan` completes, Claude displays exit instructions
- [x] After `raf plan --amend` completes, Claude displays exit instructions
- [x] Message is clear and actionable
- [x] Message uses generic `<project>` placeholder (not actual project name)

## Test Results

- All 708 tests pass
- No regressions introduced

<promise>COMPLETE</promise>


## Details
- Attempts: 1
- Elapsed time: 1m 37s
- Completed at: 2026-01-31T16:56:58.718Z
