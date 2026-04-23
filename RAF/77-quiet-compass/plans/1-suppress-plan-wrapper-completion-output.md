---
effort: low
---
# Task: Suppress Plan Wrapper Completion Output

## Objective
Remove RAF's duplicate post-session completion output for `raf plan` and `raf plan --amend` while preserving the planner agent's own final handoff message.

## Requirements
- Update `runPlanCommand` in `src/commands/plan.ts` so successful interactive planning runs no longer print RAF-managed completion summaries, plan-file listings, or `raf do ...` instructions after the runner exits.
- Update `runAmendCommand` in `src/commands/plan.ts` with the same behavior: no RAF-managed amendment summary, new-plan listing, total-task count, or `raf do ...` instruction after a successful session.
- Preserve existing non-zero interactive exit warnings.
- Preserve `No plan files were created.` and `No new plan files were created.` warnings.
- Preserve existing failure handling and empty-project cleanup behavior.
- Leave `raf plan --resume` unchanged; its completion summary is out of scope for this request.
- Add unit coverage around the plan/amend command wrapper so tests fail if these duplicate completion logs reappear.
- Update `README.md` in the `raf plan` section if needed so the documented handoff behavior matches the new CLI output contract.

## Key Decisions
- The duplicate output comes from the CLI wrapper, not from the planning prompts. The planner agent should remain the sole source of final next-step instructions.
- The change applies to fresh planning and amend flows only; resume stays as-is unless a later request broadens scope.

## Acceptance Criteria
- [ ] After a successful `raf plan` session that creates plan files, RAF does not print its own `Planning complete!`, plan list, or `Run 'raf do ...'` message after the interactive session ends.
- [ ] After a successful `raf plan --amend` session that creates new plan files, RAF does not print its own amendment summary, plan list, total-task count, or `Run 'raf do ...'` message after the interactive session ends.
- [ ] Non-zero exit warnings and no-plan-created warnings still appear in their current scenarios.
- [ ] Automated tests cover the suppressed plan/amend wrapper output behavior.
- [ ] README text, if adjusted, matches the new ownership of final planning-session instructions.

## Context
The current planning lifecycle already ends with an agent-authored completion block from the planning prompt. `src/commands/plan.ts` adds a second CLI-authored summary afterward, which creates duplicate handoff instructions.

## Implementation Steps
1. Remove the success-only post-run logging blocks from `runPlanCommand` and `runAmendCommand`, keeping the file scans only where they are still needed to decide whether to warn about missing plans or preserve cleanup behavior.
2. Add or update unit tests in the mocked plan-command command suite to assert that successful plan/amend runs do not emit the removed `logger.success` and `logger.info` completion messages.
3. Check the `README.md` `raf plan` section and adjust only if the current text would mislead users about where final next-step instructions come from.

## Files to Modify
- `src/commands/plan.ts`
- `tests/unit/plan-command-auto-flag.test.ts`
- `README.md`

## Risks & Mitigations
- Removing the entire post-run block too aggressively could also remove useful warnings for empty planning sessions. Keep the plan-file existence checks that drive `No plan files were created.` and `No new plan files were created.` warnings.
- Amend and fresh-plan flows share similar output patterns but not identical messages. Cover both flows explicitly in tests instead of assuming one path proves the other.

## Notes
- No prompt change is planned because the user explicitly chose to keep the planner agent's final completion message.

## Execution Status
- Completed on 2026-04-23 after removing the wrapper completion logs, adding regression coverage, and updating the README handoff wording.
