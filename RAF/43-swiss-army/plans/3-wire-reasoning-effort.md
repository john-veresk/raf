---
effort: medium
---
# Task: Wire reasoningEffort to CLI Invocations

## Objective
Pass the `reasoningEffort` field from ModelEntry config to the actual Claude and Codex CLI invocations.

## Context
The `reasoningEffort` field exists in the ModelEntry interface and config validation, but is never passed to the CLI when spawning claude or codex processes. This makes it a no-op configuration.

## Dependencies
1

## Requirements
- Pass `reasoningEffort` to Claude CLI when invoking it (research the correct flag)
- Pass `reasoningEffort` to Codex CLI when invoking it (research the correct flag)
- Only include the flag when `reasoningEffort` is explicitly set in the ModelEntry
- Valid values: 'none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'

## Implementation Steps
1. Research how Claude CLI accepts reasoning effort — check `claude --help` or web docs for the flag name (likely `--reasoning-effort` or similar)
2. Research how Codex CLI accepts reasoning effort — check `codex --help` or web docs
3. Read `src/core/claude-runner.ts` — add reasoning effort flag to the CLI args array in both interactive and non-interactive modes
4. Read `src/core/codex-runner.ts` — add reasoning effort flag to the CLI args array in both interactive and exec modes
5. Ensure the flag is only added when `reasoningEffort` is defined in the ModelEntry
6. Test that the args are correctly constructed

## Acceptance Criteria
- [ ] Claude CLI invocations include reasoning effort flag when configured
- [ ] Codex CLI invocations include reasoning effort flag when configured
- [ ] No reasoning effort flag is passed when not configured (undefined/omitted)
- [ ] Existing CLI invocations still work when reasoningEffort is not set

## Notes
- ClaudeRunner is at `src/core/claude-runner.ts`, CodexRunner at `src/core/codex-runner.ts`
- The runner receives model config via RunnerConfig or similar — trace how ModelEntry flows to the runner
- Claude CLI flag is likely `--reasoning-effort <value>` but verify
- Codex CLI flag needs research — may differ from Claude
