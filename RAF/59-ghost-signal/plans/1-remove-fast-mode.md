---
effort: medium
---
# Task: Remove fast mode feature entirely

## Objective
Remove all fast mode code, config fields, validation, CLI arg passing, documentation, and tests from the codebase.

## Context
Fast mode (`fast: true` in model config) was a feature that passed `--settings '{"fastMode": true}'` to the Claude CLI for faster output. It is no longer supported and generates spurious warnings (e.g., "models.plan.fast is enabled but ignored because Codex does not support fast mode") even when not configured. The entire feature should be removed as though it never existed.

## Requirements
- Remove `fast` from the `ModelEntry` type and `DEFAULT_CONFIG` in `src/types/config.ts`
- Remove `fast` from `VALID_MODEL_ENTRY_KEYS` in `src/utils/config.ts`
- Remove the `validateFastMode` function and its call site in `src/utils/config.ts`
- Remove the codex fast-mode stripping logic (`const { fast: _ignored, ...rest } = entry`) in `src/utils/config.ts`
- Remove `fast` from the model entry merging/resolution logic in `src/utils/config.ts`
- Remove the `fast` field from `RunnerConfig` in `src/core/runner-types.ts`
- Remove `this.fast` storage and all `--settings '{"fastMode": true}'` arg-pushing blocks in `src/core/claude-runner.ts`
- Remove fast mode documentation from `src/prompts/config-docs.md`
- Remove fast mode references from `README.md`
- Remove fast mode tests from `tests/unit/config.test.ts` and `tests/unit/config-command.test.ts`
- Remove `fast` from `src/core/failure-analyzer.ts` if referenced beyond a comment

## Implementation Steps

### 1. `src/types/config.ts`
- Remove the `fast?: boolean` field and its JSDoc comment from the `ModelEntry` interface (~lines 48-49)
- Remove `fast: false` from `DEFAULT_CONFIG` (~line 111)

### 2. `src/utils/config.ts`
- Remove `'fast'` from `VALID_MODEL_ENTRY_KEYS` set (~line 61)
- Remove the `validateFastMode` helper function (the function that returns the warning string at ~line 184 and checks `entry.fast` at ~lines 176-178)
- Remove the call to `validateFastMode` and any related warning-push logic (~line 193 area)
- Remove the destructuring that strips `fast` from codex entries: `const { fast: _ignored, ...rest } = entry` (~line 345)
- Remove the `fast` field from the model entry merge/resolution spread (~lines 359-362)

### 3. `src/core/runner-types.ts`
- Remove the `fast?: boolean` field and its JSDoc (~lines 76-80)

### 4. `src/core/claude-runner.ts`
- Remove `private fast?: boolean` field (~line 87)
- Remove `this.fast = config.fast` assignment (~line 92)
- Remove all three `if (this.fast) { args.push('--settings', '{"fastMode": true}') }` blocks (~lines 118-120, 220-222, 362-364)

### 5. `src/prompts/config-docs.md`
- Remove `"fast"` from the model entry key list (~line 30)
- Remove the `fast` bullet point documentation (~line 35)
- Remove the "Fast mode" section (~lines 302-313)

### 6. `README.md`
- Remove/update the line referencing `fast` in task line display format (~line 93)
- Remove any other fast mode references

### 7. Tests
- `tests/unit/config.test.ts`: Remove the two test cases for fast mode warnings (~lines 134-142, 464-477)
- `tests/unit/config-command.test.ts`: Remove the test case for fast mode warning (~lines 182-186)

### 8. Verify
- Run `npx tsc --noEmit` to confirm no type errors
- Run the test suite to confirm all tests pass
- Grep for any remaining `fast` references that need cleanup

## Acceptance Criteria
- [ ] No `fast` field exists in any TypeScript type, interface, or config object
- [ ] No fast mode validation, warning, or stripping logic remains
- [ ] No `--settings '{"fastMode": true}'` is ever passed to the CLI
- [ ] All fast mode documentation removed from config-docs.md and README.md
- [ ] All fast mode tests removed
- [ ] TypeScript compiles cleanly (`npx tsc --noEmit`)
- [ ] All remaining tests pass

## Notes
- The `failure-analyzer.ts` reference ("Uses a fast model") is unrelated to the fast mode feature — it's describing model speed characteristics. Leave it as-is.
- After removal, `fast` becomes an unknown key and will be rejected by existing validation if someone still has it in their config — this is the desired behavior per the user's decision.
