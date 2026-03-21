---
effort: medium
---
# Task: Fix Codex Project Name Generation

## Objective
Make `raf plan` produce usable creative project name suggestions when `models.nameGeneration.provider` is `codex` instead of degrading to the extracted-input fallback.

## Context
The current name-generation flow in `src/utils/name-generator.ts` only accepts model output when it can parse enough valid multiline suggestions. When that parsing fails, RAF falls back to `generateFallbackName()`, which just extracts the first meaningful words from the project description. That matches the user-reported Codex failure mode: name suggestion becomes a single low-quality line based on the input text rather than a real generated name.

This task is specifically about the Codex-backed name-generation path. The user wants Codex to follow the same naming instructions and UX as Claude: creative kebab-case suggestions, 1-3 words each, and the existing picker / auto-select-first behavior. If Codex returns only 1-2 valid suggestions, RAF should still use them instead of immediately falling back to extracted input words. The extracted-word fallback should remain only for hard failure or completely unusable output.

This work is independent from Tasks 1-4 in this project.

## Requirements
- Keep the existing naming instructions and UX consistent with the Claude path:
  - 3-5 creative kebab-case suggestions when available
  - 1-3 words per name
  - existing name picker behavior in interactive mode
  - existing auto-select-first behavior in auto mode
- Fix the Codex name-generation path so `models.nameGeneration.provider = codex` produces usable suggestions instead of frequently collapsing into the extracted-input fallback.
- Adjust parsing/fallback behavior so 1-2 valid Codex suggestions are accepted and surfaced to the user when that is all Codex returns.
- Preserve the extracted-input fallback for genuine failure cases only, such as CLI failure or no usable suggestions after sanitization.
- Keep Claude-backed name generation behavior unchanged.
- Add focused regression coverage for Codex-specific invocation/parsing and the new partial-result fallback threshold.

## Implementation Steps
1. Inspect the current Codex name-generation execution path in `src/utils/name-generator.ts` and determine why Codex output is being reduced to fallback names.
2. Update the Codex invocation and any provider-specific response handling needed so Codex can reliably return parsable multiline suggestions while preserving the existing prompt semantics.
3. Refine `generateProjectNames()` so partial-but-usable model output (1-2 valid names) is retained instead of discarded in favor of the extracted-input fallback.
4. Keep existing sanitization, deduplication, max-length, picker integration, and auto-select-first behavior intact for both providers.
5. Add or update unit tests in the name-generation / planning command suites to cover:
   - Codex provider invocation
   - Codex multiline suggestion parsing
   - acceptance of 1-2 valid suggestions
   - fallback to extracted input words only when no usable model suggestions remain
6. Run the relevant test suite and update any stale assertions tied to the old fallback threshold or provider assumptions.

## Acceptance Criteria
- [ ] With `models.nameGeneration.provider` set to `codex`, `raf plan` produces creative suggestions instead of defaulting to a first-words-from-input name on partial model output.
- [ ] If Codex returns 1-2 valid suggestions, RAF uses those suggestions rather than falling back to extracted input words.
- [ ] If the Codex CLI call fails or produces no usable suggestions, RAF still falls back to the extracted-input name.
- [ ] Claude-backed name generation and the existing name picker / auto-select-first flow remain unchanged.
- [ ] Focused regression tests cover Codex provider behavior and partial-result handling.
- [ ] All tests pass.

## Notes
Historical outcome docs elsewhere in `RAF/` may describe older provider-wiring behavior that no longer matches the current implementation. Verify the live code path before assuming prior fixes are still present.
