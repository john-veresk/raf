effort: low
---
# Task: Remove Token Report from Plan Command

## Objective
Remove all token usage reporting from `raf plan` and `raf plan --amend`, including the session-parser module that only exists to support this feature.

## Context
The token report shown after planning sessions is not useful — planning is an interactive session where token cost is less relevant than during automated task execution. Removing it simplifies the plan command and eliminates dead code.

## Requirements
- Remove token reporting from both `runPlanCommand()` and `runAmendCommand()` in `src/commands/plan.ts`
- Delete the `displayPlanSessionTokenSummary()` function entirely
- Delete `src/utils/session-parser.ts` (only consumer is the plan command)
- Delete `tests/unit/session-parser.test.ts`
- Remove the `sessionId` parameter from `claudeRunner.runInteractive()` in `src/core/claude-runner.ts` (no other callers use it)
- Clean up all unused imports in affected files

## Implementation Steps

1. **Edit `src/commands/plan.ts`:**
   - Remove imports: `TokenTracker`, `formatTokenTotalSummary`, `TokenSummaryOptions`, `parseSessionById`, `crypto`
   - Remove `getDisplayConfig` and `getPricingConfig` from the config import (if not used elsewhere in the file)
   - In `runPlanCommand()`: remove `sessionId` generation, `sessionCwd` variable, remove `sessionId` from `claudeRunner.runInteractive()` options, remove `displayPlanSessionTokenSummary()` call
   - In `runAmendCommand()`: same removals as above
   - Delete the entire `displayPlanSessionTokenSummary()` function (around lines 702-741)

2. **Edit `src/core/claude-runner.ts`:**
   - Remove `sessionId` from the `runInteractive()` method's options interface/parameter
   - Remove any internal usage of `sessionId` (e.g., passing `--session-id` flag to Claude CLI)

3. **Delete files:**
   - `src/utils/session-parser.ts`
   - `tests/unit/session-parser.test.ts`

4. **Verify:** Run `npm run build` and `npm test` to ensure no broken imports or failing tests

## Acceptance Criteria
- [ ] `raf plan` no longer displays a token usage summary after the planning session
- [ ] `raf plan --amend` no longer displays a token usage summary after the amendment session
- [ ] `src/utils/session-parser.ts` is deleted
- [ ] `tests/unit/session-parser.test.ts` is deleted
- [ ] `sessionId` parameter removed from `runInteractive()` API
- [ ] No unused imports remain in modified files
- [ ] Build passes (`npm run build`)
- [ ] Tests pass (`npm test`)

## Notes
- The `TokenTracker`, `formatTokenTotalSummary`, and `formatTaskTokenSummary` utilities in `token-tracker.ts` and `terminal-symbols.ts` are still used by `raf do` — do NOT delete those modules
- The `display` and `pricing` config sections remain valid for `raf do` usage — do NOT remove them from config types/defaults
