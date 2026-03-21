# Outcome: Display frontmatter effort in compact task status

## Summary
Updated compact `raf do` task status lines to show the plan frontmatter effort (`low`/`medium`/`high`) instead of the model runtime `reasoningEffort` parameter.

## Key Changes Made
- `src/commands/do.ts`
  - Added `currentEffort` tracking for compact status display metadata.
  - Set `currentEffort` from `task.frontmatter?.effort` after model resolution.
  - Updated compact status rendering for running/completed/failed lines to pass `effort: currentEffort`.
  - Removed use of `currentModelReasoningEffort` in compact display call sites so runtime reasoning settings are no longer conflated with task effort frontmatter.

## Verification
- TypeScript build passed:
  - `npm run -s build`
- Focused tests passed:
  - `NODE_OPTIONS='--experimental-vm-modules' npx jest --watchman=false tests/unit/terminal-symbols.test.ts tests/unit/do-model-display.test.ts`

## Notes
- Tasks without `effort` frontmatter continue to render model metadata without a blank effort slot because `formatModelMetadata` only appends effort when defined.

<promise>COMPLETE</promise>
