---
effort: high
---
# Task: Add Fast Mode to Model Config

## Objective
Extend ModelEntry with a `fast: boolean` option and wire it to Claude and Codex CLI invocations.

## Context
Claude Code supports a "fast mode" that uses the same model with faster output. Codex may have similar options. This should be configurable per model entry so users can have fast planning but thorough execution.

## Dependencies
1, 3

## Requirements
- Add `fast?: boolean` to the ModelEntry interface in `src/types/config.ts`
- Research how to pass fast mode to Claude CLI (likely `--fast` flag or similar)
- Research how to pass fast mode to Codex CLI
- Wire the fast flag in both ClaudeRunner and CodexRunner
- Only pass the flag when `fast: true` is set
- Update config validation to accept the new field
- Update config-docs.md with fast mode documentation
- Default to false/omitted (not fast)

## Implementation Steps
1. Search the web for how Claude Code CLI accepts fast mode (check `claude --help` or docs)
2. Search the web for how Codex CLI accepts fast/speed options
3. Read `src/types/config.ts` — add `fast?: boolean` to ModelEntry interface
4. Read `src/utils/config.ts` — add validation for the `fast` field (boolean type check)
5. Read `src/core/claude-runner.ts` — add the fast flag to CLI args when `fast: true`
6. Read `src/core/codex-runner.ts` — add the fast flag to CLI args when `fast: true`
7. Update `src/prompts/config-docs.md` — document the fast option
8. Update DEFAULT_CONFIG if fast should have a default value (probably omit = not fast)

## Acceptance Criteria
- [ ] ModelEntry interface includes `fast?: boolean`
- [ ] Claude CLI invocations include the fast flag when configured
- [ ] Codex CLI invocations include the fast flag when configured (or document if unsupported)
- [ ] Config validation accepts `fast: true/false` on model entries
- [ ] No fast flag passed when not configured
- [ ] config-docs.md documents the fast option with examples

## Notes
- This depends on task 3 (wire reasoning effort) because both modify the same runner files — doing them in sequence avoids conflicts
- Claude Code fast mode info: "Fast mode for Claude Code uses the same Claude Opus 4.6 model with faster output. It does NOT switch to a different model."
- If Codex doesn't support a fast mode equivalent, document that and skip the Codex wiring
