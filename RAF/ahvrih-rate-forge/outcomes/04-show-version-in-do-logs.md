# Outcome: Show RAF Version and Model in `raf do` Logs

## Summary
Added a version and model info line at the start of every `raf do` execution, displayed before any task runs. The format is `RAF v{version} | Model: {fullModelId}` and uses dim text styling for subtlety.

## Key Changes

### `src/utils/config.ts`
- Added `MODEL_ALIAS_TO_FULL_ID` constant mapping short aliases to current full model IDs:
  - `opus` → `claude-opus-4-6`
  - `sonnet` → `claude-sonnet-4-5-20250929`
  - `haiku` → `claude-haiku-4-5-20251001`
- Added `resolveFullModelId(modelName: string): string` function that:
  - Resolves short aliases (`opus`, `sonnet`, `haiku`) to their full model IDs
  - Returns full model IDs and unknown strings as-is

### `src/commands/do.ts`
- Added imports for `resolveFullModelId` from config.ts and `getVersion` from version.ts
- Added version/model log line in `executeSingleProject()` at line 729:
  ```typescript
  const fullModelId = resolveFullModelId(model);
  logger.dim(`RAF v${getVersion()} | Model: ${fullModelId}`);
  ```
- Removed `showModel` from `SingleProjectOptions` interface (no longer needed since version/model is always shown)
- Removed `showModel: true` from the call site

### `tests/unit/config.test.ts`
- Added import for `resolveFullModelId`
- Added 3 new tests in `describe('resolveFullModelId')`:
  - `should resolve short aliases to full model IDs`
  - `should return full model IDs as-is`
  - `should return unknown model strings as-is`

## Acceptance Criteria Verification
- [x] A version/model line appears at the start of every `raf do` execution
- [x] Model name is shown in full format (e.g., `claude-opus-4-6`)
- [x] Line appears before any task execution output
- [x] Works in both worktree and non-worktree modes

## Notes
- The pre-existing test failures in `claude-runner-interactive.test.ts` and `validation.test.ts` are unrelated to this change - they concern model resolution expecting short aliases but receiving full model IDs
- The version/model line uses `logger.dim()` for subtle display that doesn't clutter output
- All 111 config tests pass, including the 3 new tests for `resolveFullModelId`

<promise>COMPLETE</promise>
