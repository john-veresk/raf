# Task: Set medium reasoning effort for `raf do` execution

## Objective
Configure `raf do` to spawn Claude CLI processes with `CLAUDE_CODE_EFFORT_LEVEL=medium` to reduce reasoning overhead during task execution.

## Dependencies
01

## Context
By default, Claude Opus uses "high" effort level which allocates more thinking tokens. For automated task execution via `raf do`, medium effort provides a good balance of speed, cost, and capability. The `CLAUDE_CODE_EFFORT_LEVEL` environment variable is the supported mechanism for controlling this in the Claude Code CLI.

RAF's `ClaudeRunner` already passes `process.env` to spawned processes (lines 296, 400, 512 in `claude-runner.ts`). The change needs to inject `CLAUDE_CODE_EFFORT_LEVEL=medium` into the environment for non-interactive (task execution) runs, while leaving interactive planning sessions (`raf plan`) at default effort.

## Requirements
- Set `CLAUDE_CODE_EFFORT_LEVEL=medium` in the environment when spawning Claude processes for `raf do` task execution
- Do NOT affect `raf plan` (interactive planning sessions should keep default/high effort)
- Do NOT affect failure analysis (which uses Haiku via `ClaudeRunner`)
- The effort level should be configurable through `ClaudeRunnerOptions` or `ClaudeRunnerConfig` so it's not hardcoded deep in the runner
- Pass the env var by spreading it into the `env` object passed to `spawn()` and `pty.spawn()`

## Implementation Steps
1. Add an optional `effortLevel` field to `ClaudeRunnerOptions` or `ClaudeRunnerConfig` in `src/core/claude-runner.ts`
2. In the `run()` and `runVerbose()` methods, merge `CLAUDE_CODE_EFFORT_LEVEL` into the environment when `effortLevel` is set
3. In `src/commands/do.ts`, pass `effortLevel: 'medium'` when constructing or calling `ClaudeRunner` for task execution
4. Ensure the interactive `runInteractive()` method does NOT apply the effort override (planning should stay at default)
5. Add tests verifying the env var is passed correctly
6. Add tests verifying that planning mode does not get the env var

## Acceptance Criteria
- [ ] `raf do` spawns Claude with `CLAUDE_CODE_EFFORT_LEVEL=medium` in the environment
- [ ] `raf plan` does NOT set `CLAUDE_CODE_EFFORT_LEVEL` (uses default behavior)
- [ ] The effort level is configurable (not hardcoded in the spawn call)
- [ ] Existing tests pass
- [ ] New tests verify the env var injection

## Notes
- The three spawn points in `claude-runner.ts` are: `pty.spawn()` at line 291 (interactive), `spawn()` at line 390 (non-interactive), and `spawn()` at line 499 (verbose). Only the non-interactive and verbose spawns should get the effort override.
- The env var `CLAUDE_CODE_EFFORT_LEVEL` is confirmed as the correct name per official docs at code.claude.com/docs/en/model-config. Note: there is a known UI bug (GitHub issue #23604) where the `/model` UI always shows "High effort" regardless of the env var, but the env var is believed to still affect actual API requests.
- An alternative approach (if the env var turns out to be truly broken) would be to write `"effortLevel": "medium"` to a `.claude/settings.json` in the working directory before spawning Claude. This is a fallback, not the primary approach.
