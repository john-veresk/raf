# Outcome: Show Name Picker in Auto Mode

## Summary

Removed the auto-select branch in `plan.ts` so that `raf plan -y` without a name argument always shows the interactive name picker. The `-y` flag now only controls `dangerouslySkipPermissions` for the Claude runner.

## Changes Made

- **`src/commands/plan.ts`** (lines 180-187): Replaced the `if (autoMode) { ... } else { ... }` block with a single unconditional `finalProjectName = await pickProjectName(suggestedNames);` call.

## Verification

- `tsc --noEmit` passes with no errors.

<promise>COMPLETE</promise>
