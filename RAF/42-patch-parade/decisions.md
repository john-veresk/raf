# Project Decisions

## For `fix-minor-bugs`, which specific bugs do you want included in scope beyond the two concrete issues you already named?
Take the minor bugs from `/Users/eremeev/projects/RAF/RAF/41-echo-chamber/outcomes/2-e2e-test-codex-provider.md`, specifically the two new minor issues documented there:
- `item.completed` with `item.type: "error"` is not rendered
- `turn.failed` with nested `error.message` falls back to default text

## For `fix-provider-aware-name-generation`, should the plan include tests for both `claude` and `codex`, or is wiring plus a focused regression test enough?
Focused regression test is enough.

## For `fix-codex-opus-model-selection`, what should RAF do when the provider is `codex` and the resolved model is `opus`: remap to a supported Codex default, reject with a clear RAF error, or something else?
This should not happen. Investigate and fix the incorrect resolution/config path so Codex does not resolve to `opus` in the first place.

Investigation notes:
- `resolveModelOption()` falls back to `getModel(scenario)` without a provider argument
- `plan.ts` and `do.ts` call `resolveModelOption()` before threading `options.provider` into model resolution
- `src/prompts/planning.ts` and `src/prompts/amend.ts` contain hardcoded example frontmatter with `model: opus`, which can bias Codex planning output toward an unsupported model override

## For `update-cli-help-docs`, should I update only CLI help text and `README.md`, or also any prompt/docs artifacts under `src/prompts` and `RAF/*` that still mention the removed flags?
Update only CLI help text and `README.md`.
