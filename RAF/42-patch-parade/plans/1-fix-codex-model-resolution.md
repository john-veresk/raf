---
effort: medium
---
# Task: Fix Codex Model Resolution

## Objective
Ensure RAF resolves provider-specific default and effort-based models correctly so Codex flows never select the Claude-only `opus` model.

## Context
The current Codex path can still surface `opus`, which leads to unsupported-model errors such as `The 'opus' model is not supported when using Codex with a ChatGPT account.` Investigation found that provider context is dropped during default model resolution, and the planning prompts still include a hardcoded `model: opus` example that can bias generated plans.

## Requirements
- Fix the root cause instead of remapping `opus` after the fact.
- Update the default model resolution path so `--provider codex` uses `codexModels.*` and `codexEffortMapping.*` consistently.
- Make `plan` and `do` read `options.provider` before resolving default models and pass provider context through the relevant helpers.
- Review provider-sensitive helpers such as `resolveModelOption()` and `getModel()` call sites to ensure Codex never inherits Claude defaults implicitly.
- Remove or neutralize hardcoded `model: opus` prompt examples in planning-related prompts so Codex-generated plans are not steered toward unsupported explicit model overrides.
- Add focused regression coverage for the incorrect provider/model resolution path.

## Implementation Steps
1. Trace the startup model-resolution path for `raf plan` and `raf do`, including CLI flag parsing and config lookup.
2. Update the resolution helpers to accept provider context where needed and use provider-specific defaults.
3. Adjust `src/commands/plan.ts` and `src/commands/do.ts` to resolve provider before model selection and thread it through consistently.
4. Revise planning/amend prompt examples to avoid Codex-hostile hardcoded `model: opus` guidance.
5. Add or update tests that prove Codex defaults resolve to supported Codex models rather than Claude aliases.

## Acceptance Criteria
- [ ] `--provider codex` no longer resolves default plan or execution models to `opus`.
- [ ] Effort-based model resolution uses `codexEffortMapping` when the provider is `codex`.
- [ ] Planning guidance no longer nudges Codex plans toward explicit `model: opus` frontmatter.
- [ ] Focused regression tests cover the provider-aware resolution path.
- [ ] All tests pass

## Notes
The fix should preserve the existing Claude defaults and should not introduce fallback remapping that hides the underlying resolution bug.
