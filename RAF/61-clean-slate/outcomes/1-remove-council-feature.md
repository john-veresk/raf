# Outcome: Remove Council Feature

## Summary

Removed the `councilMode` feature entirely from the codebase. No backward-compat stubs were left — the feature is cleanly gone, except for a `REMOVED_KEYS` entry that gives users with old configs a helpful error message.

## Changes Made

- **`src/types/config.ts`**: Removed `councilMode: boolean` from `RafConfig` interface and `councilMode: false` from `DEFAULT_CONFIG`.
- **`src/utils/config.ts`**: Removed `'councilMode'` from `VALID_TOP_LEVEL_KEYS`; added `councilMode` to `REMOVED_KEYS` with message `'"councilMode" has been removed.'`; removed the validation block; removed the `deepMerge` assignment; removed the `getCouncilMode()` export function.
- **`src/prompts/planning.ts`**: Removed `councilMode?` from `PlanningPromptParams`; removed `councilSection` variable and conditional; changed return to use `systemPrompt` directly.
- **`src/prompts/amend.ts`**: Same removals as planning.ts.
- **`src/commands/plan.ts`**: Removed `getCouncilMode` from import; removed `councilMode: getCouncilMode()` from both `getPlanningPrompt` and `getAmendPrompt` calls.
- **`src/prompts/config-docs.md`**: Removed the `### councilMode — Council Mode for Planning` section.

## Verification

- `grep councilMode src/` returns only the `REMOVED_KEYS` entry (expected).
- `tsc` compiles with no errors.

<promise>COMPLETE</promise>
