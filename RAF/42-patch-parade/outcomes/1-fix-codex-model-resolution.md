# Outcome: Fix Codex Model Resolution

## Summary

Fixed the root cause of Codex provider resolving to Claude-only models (like `opus`) by threading provider context through the model resolution pipeline.

## Changes Made

### Core fix: `src/utils/validation.ts`
- Added `provider` parameter to `resolveModelOption()` so the fallback path (`getModel(scenario, provider)`) uses provider-specific defaults instead of always using Claude defaults.

### Command integration: `src/commands/plan.ts`
- Moved provider resolution (`options.provider`) before model resolution so it's available when calling `resolveModelOption()`.
- Passed provider to `resolveModelOption(..., provider)`.

### Command integration: `src/commands/do.ts`
- Extracted provider early and passed it to `resolveModelOption(..., provider)`.
- Fixed `getModel('failureAnalysis')` call to pass `provider` so failure analysis also uses Codex models when appropriate.

### Prompt neutralization: `src/prompts/planning.ts` and `src/prompts/amend.ts`
- Changed hardcoded `model: opus` example in plan/amend prompts to `model: sonnet`, which is valid for both providers and doesn't bias Codex-generated plans toward an unsupported model.

### Regression tests: `tests/unit/validation.test.ts`
- Added test: codex provider returns codex-specific defaults (`gpt-5.3-codex` for plan, `gpt-5.4` for execute).
- Added test: claude/undefined provider returns claude defaults (`opus`).
- Added test: no scenario with codex provider ever resolves to `opus`.

## Acceptance Criteria

- [x] `--provider codex` no longer resolves default plan or execution models to `opus`
- [x] Effort-based model resolution uses `codexEffortMapping` when the provider is `codex`
- [x] Planning guidance no longer nudges Codex plans toward explicit `model: opus` frontmatter
- [x] Focused regression tests cover the provider-aware resolution path
- [x] All tests pass (4 pre-existing failures unrelated to this change)

<promise>COMPLETE</promise>
