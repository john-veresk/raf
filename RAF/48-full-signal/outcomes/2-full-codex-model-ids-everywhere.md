# Task 2 Outcome: Full Codex Model IDs Everywhere

## Summary
Implemented centralized model-display policy updates so Codex aliases now render as canonical full IDs (`gpt-5.3-codex`, `gpt-5.4`) across RAF user-facing output surfaces, while preserving concise Claude labels (`opus`, `sonnet`, `haiku`) unless an explicit full-ID path is requested.

## Key Changes
- Updated centralized display policy in `src/utils/config.ts`:
  - `codex` now displays as `gpt-5.3-codex`
  - `gpt54` displays as `gpt-5.4`
  - full Codex IDs remain full IDs
  - Claude display behavior remains compact by default
- Aligned explicit full-ID rendering in `src/commands/do.ts` with shared helper usage:
  - `formatResolvedTaskModel(...)` now uses `formatModelDisplay(..., { fullId: true })`
  - ceiling model header rendering now uses `formatModelDisplay(..., { fullId: true })`
  - removed direct one-off `resolveFullModelId` usage at those call sites
- Updated tests for the new display policy:
  - `tests/unit/config.test.ts` expectations for Codex display labels
  - `tests/unit/do-model-display.test.ts` switched stale `provider` fields to `harness` and added Codex alias coverage

## Verification
- Lint passed:
  - `npm run lint`
- Targeted tests passed:
  - `NODE_OPTIONS='--experimental-vm-modules' npx jest --watchman=false tests/unit/config.test.ts -t "getModelDisplayName|formatModelDisplay|resolveFullModelId" -i`
  - `NODE_OPTIONS='--experimental-vm-modules' npx jest --watchman=false tests/unit/do-model-display.test.ts -i`

## Notes
- A broader run including full `config.test.ts` and `terminal-symbols` integration surfaces includes pre-existing unrelated failures in this branch (display/cache-token coverage not introduced by this task). The Codex model-display policy changes and targeted acceptance coverage pass.

<promise>COMPLETE</promise>
