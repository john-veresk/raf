---
effort: high
---
# Task: Implement Codex Runner

## Objective
Implement `CodexRunner` that wraps the Codex CLI (`codex` binary) with the same interface as `ClaudeRunner`.

## Context
With the runner interface extracted in task 2, we can now implement the Codex-specific runner. Codex CLI has different flags, output formats, and interaction patterns than Claude CLI. Key differences:
- Non-interactive: `codex exec --full-auto --json` (vs Claude's `-p --output-format stream-json`)
- Interactive: `codex` TUI via PTY (vs Claude's PTY)
- No `--system-prompt` flag — system prompt must be prepended to user message
- JSONL output with different event types (CommandExecution, FileChange, AgentMessage, etc.)
- Model flag: `-m` (vs `--model`)
- Permission bypass: `--full-auto` (vs `--dangerously-skip-permissions`)

## Dependencies
1, 2

## Requirements
- Implement `CodexRunner` class implementing `ICliRunner`
- Handle system prompt by prepending it to the user message
- Parse Codex JSONL events into the shared `RunResult` format
- Support both interactive (PTY) and non-interactive (exec) modes
- Discover `codex` binary via `which codex`
- Build correct CLI arguments for Codex
- Stream renderer for Codex JSONL events (separate from Claude's stream-renderer)

## Implementation Steps

1. **Create `src/parsers/codex-stream-renderer.ts`**:
   - Parse Codex JSONL events (one JSON object per line)
   - Map Codex event types to `RenderResult` (same interface as Claude's renderer):
     - `AgentMessage` → text content + display
     - `CommandExecution` → tool display (show command + exit code)
     - `FileChange` → tool display (show file path + change kind)
     - `McpToolCall` → tool display
     - `TodoList` → skip or minimal display
   - Extract any usage/cost data from Codex events if available
   - Export `renderCodexStreamEvent(line: string): RenderResult`

2. **Create `src/core/codex-runner.ts`**:
   - Implement `ICliRunner` interface
   - `getCodexPath()`: `execSync('which codex', ...)`
   - Constructor takes `RunnerConfig` (model, provider)

3. **Implement `runInteractive()`**:
   - Spawn `codex` (no `exec` subcommand) via PTY
   - Build args: `-m <model>`
   - Combine system prompt and user message: `"[System Instructions]\n\n{systemPrompt}\n\n[User Request]\n\n{userMessage}"`
   - Pass combined message as positional argument
   - Handle PTY stdin/stdout passthrough (same pattern as ClaudeRunner)
   - Handle cleanup on exit

4. **Implement `run()` / `runVerbose()` (non-interactive execution)**:
   - Spawn: `codex exec --full-auto --json -m <model> <combined_prompt>`
   - Build the combined prompt (system + user prompt prepended)
   - Parse JSONL stdout line by line using `renderCodexStreamEvent()`
   - Accumulate text content for output
   - Apply timeout logic (same pattern as ClaudeRunner)
   - Use shared completion detector for outcome file monitoring
   - Return `RunResult` with output, exitCode, timedOut, contextOverflow

5. **Implement `runResume()`**:
   - Throw `Error('Session resume is not supported by Codex CLI')`

6. **Implement `kill()` and `isRunning()`**:
   - Same pattern as ClaudeRunner (Ctrl+C via PTY write, SIGTERM fallback)

7. **Update `src/core/runner-factory.ts`**:
   - Import `CodexRunner`
   - Return `new CodexRunner(config)` for `provider: 'codex'`

8. **Handle Codex-specific edge cases**:
   - Codex may not report token usage in the same way — handle missing usage data gracefully
   - Codex `--json` output might include events we don't care about — filter/skip unknown types
   - `--ephemeral` flag to avoid session persistence pollution

## Acceptance Criteria
- [ ] `CodexRunner` implements `ICliRunner` fully
- [ ] `codex exec` spawns correctly with proper flags
- [ ] System prompt is prepended to user message correctly
- [ ] JSONL events are parsed and displayed properly in verbose mode
- [ ] Interactive mode works via PTY
- [ ] Timeout and completion detection work
- [ ] `createRunner({ provider: 'codex' })` returns a working CodexRunner
- [ ] TypeScript compiles without errors

## Notes
- Test by running `raf do <project> --provider codex` once integrated
- Codex may not provide `total_cost_usd` in the same format — handle gracefully with zeros
- The combined prompt approach (prepending system prompt) means Codex sees one large message. This is simpler but less structured than Claude's separate system prompt. It was chosen for simplicity per user decision.
- Use `--ephemeral` flag in non-interactive mode to keep things clean
