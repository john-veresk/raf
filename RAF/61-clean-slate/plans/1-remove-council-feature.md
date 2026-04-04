---
effort: low
---
# Task: Remove Council Feature

## Objective
Remove the council mode feature entirely from the codebase.

## Context
Council mode is a planning feature where the planner spawns sub-agents to investigate tasks in parallel. It's off by default and being removed as part of a clean-up. All references should be deleted completely (no deprecated stubs).

## Requirements
- Remove `councilMode` from the `RafConfig` interface and `DEFAULT_CONFIG`
- Remove `councilMode` from config validation and the valid keys set
- Remove the `getCouncilMode()` getter function
- Remove council mode prompt injection from planning and amend prompts
- Remove council mode parameter passing from the plan command
- Remove council mode documentation from config-docs.md
- No backward-compat stubs — clean removal

## Implementation Steps

1. **`src/types/config.ts`**:
   - Line 95-96: Remove `councilMode: boolean` from `RafConfig` interface
   - Line 160: Remove `councilMode: false` from `DEFAULT_CONFIG`

2. **`src/utils/config.ts`**:
   - Line 42: Remove `'councilMode'` from `VALID_TOP_LEVEL_KEYS` set
   - Lines 273-278: Remove the `councilMode` validation block
   - Lines 557-559: Remove the `getCouncilMode()` function

3. **`src/prompts/planning.ts`**:
   - Lines 103-114: Remove the `councilSection` variable and council mode conditional. Change `fullSystemPrompt` to just use `systemPrompt` directly (or remove the variable entirely).
   - Remove `councilMode` from the prompt params interface/type.

4. **`src/prompts/amend.ts`**:
   - Lines 165-176: Same removal as planning.ts — remove `councilSection` and the conditional.
   - Remove `councilMode` from the amend prompt params interface/type.

5. **`src/commands/plan.ts`**:
   - Line 295: Remove `councilMode: getCouncilMode()` from `getPlanningPrompt()` call
   - Line 542 (approx): Remove `councilMode: getCouncilMode()` from amend prompt call
   - Remove the `getCouncilMode` import

6. **`src/prompts/config-docs.md`**:
   - Lines 172-176: Remove the `### councilMode — Council Mode for Planning` section

## Acceptance Criteria
- [ ] `councilMode` does not appear anywhere in `src/` (grep returns zero matches)
- [ ] TypeScript compiles without errors
- [ ] Existing config files with `councilMode: false` are silently ignored or produce a clear removed-key error (check if `REMOVED_KEYS` needs an entry — add one if validation would reject unknown keys)

## Notes
- The `REMOVED_KEYS` map in `src/utils/config.ts` (line 46) provides helpful migration errors for removed config keys. Add `councilMode` there with a message like `'"councilMode" has been removed.'` so users with existing configs get a clear error instead of a generic "unknown key" message.
