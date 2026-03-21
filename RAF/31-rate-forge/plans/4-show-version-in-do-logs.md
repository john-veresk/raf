# Task: Show RAF Version and Model in `raf do` Logs

## Objective
Display the RAF version and execution model in a single combined line at the start of `raf do` execution.

## Context
Currently `raf do` logs don't prominently show what version of RAF is running or which model is being used for execution. This information is useful for debugging and for users to confirm their setup. The model name should be shown in its full format (e.g., `claude-opus-4-6` rather than just `opus`).

## Requirements
- Display a single combined line at the start of task execution, before any tasks run
- Format: `RAF v{version} | Model: {fullModelId}`
- Version comes from `package.json` via the existing `getVersion()` utility
- Model should be the full model ID (e.g., `claude-opus-4-6`), not the short alias
- Use the existing logger formatting (e.g., `logger.info` or appropriate level)
- Do NOT show effort level — the `effort.*` config is being removed in task 08

## Implementation Steps
1. In `src/commands/do.ts`, add a log line at the start of the execution flow (before the first task begins)
2. Resolve the full model ID — if the config uses a short alias like `opus`, resolve it to the full model ID
3. Format and display the combined line
4. Ensure this appears in both worktree and non-worktree execution modes

## Acceptance Criteria
- [ ] A version/model line appears at the start of every `raf do` execution
- [ ] Model name is shown in full format (e.g., `claude-opus-4-6`)
- [ ] Line appears before any task execution output
- [ ] Works in both worktree and non-worktree modes

## Notes
- The existing `getVersion()` utility is in `src/utils/version.ts`.
- Model resolution from short alias to full ID may already exist in the codebase — check how `ClaudeRunner` resolves model names.
- Keep the display subtle (dim or info level) so it doesn't clutter the output.
