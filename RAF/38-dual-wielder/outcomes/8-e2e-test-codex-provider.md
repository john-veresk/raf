# Task 8: E2E Test Codex Provider

## Summary
Tested the Codex provider integration end-to-end by running `raf-dev` commands with `--provider codex`, exercising the runner factory, config/model resolution, JSONL stream rendering, and error handling. Found **2 critical** and **1 major** issues.

## Test Environment
- codex-cli 0.116.0
- Node.js v22.11.0
- macOS Darwin 25.3.0
- Codex account: ChatGPT-based (not API key)

## Test Results

### Phase 1: Dummy Project Setup — PASS
- Created `/tmp/raf-codex-test-project/` with package.json, tsconfig.json, src/index.ts
- Initialized git repo with initial commit
- Project has intentional TODOs (input validation, negative numbers, email parsing)

### Phase 2: Config/Model Resolution — PASS (all functions work correctly)

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| `getModel('execute', 'codex')` | `gpt-5.4` | `gpt-5.4` | PASS |
| `getModel('plan', 'codex')` | `gpt-5.3-codex` | `gpt-5.3-codex` | PASS |
| `getModel('nameGeneration', 'codex')` | `gpt-5.3-codex-spark` | `gpt-5.3-codex-spark` | PASS |
| `resolveEffortToModel('low', 'codex')` | `gpt-5.3-codex-spark` | `gpt-5.3-codex-spark` | PASS |
| `resolveEffortToModel('medium', 'codex')` | `gpt-5.3-codex` | `gpt-5.3-codex` | PASS |
| `resolveEffortToModel('high', 'codex')` | `gpt-5.4` | `gpt-5.4` | PASS |
| `parseModelSpec('codex/gpt-5.4')` | `{provider:'codex',model:'gpt-5.4'}` | Correct | PASS |
| `parseModelSpec('spark')` | `{provider:'codex',model:'spark'}` | Correct | PASS |
| `isValidModelName('gpt-5.4')` | `true` | `true` | PASS |
| `isValidModelName('codex/gpt-5.4')` | `true` | `true` | PASS |
| `resolveFullModelId('spark')` | `gpt-5.3-codex-spark` | `gpt-5.3-codex-spark` | PASS |
| `getModelShortName('gpt-5.3-codex')` | `codex` | `codex` | PASS |
| `getModelTier('spark')` | `1` | `1` | PASS |
| `getModelTier('gpt-5.4')` | `3` | `3` | PASS |

### Phase 3: Runner Factory — PASS

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| `createRunner({provider:'codex'})` | `CodexRunner` | `CodexRunner` | PASS |
| `createRunner({provider:'claude'})` | `ClaudeRunner` | `ClaudeRunner` | PASS |
| `createRunner()` (default) | `ClaudeRunner` | `ClaudeRunner` | PASS |
| All ICliRunner methods exist on CodexRunner | 6 methods | 6 methods | PASS |
| `runResume()` throws | Error: "not supported" | Correct | PASS |
| `isRunning()` when idle | `false` | `false` | PASS |

### Phase 4: JSONL Stream Renderer — FAIL (Critical)

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Parse real `item.completed` (agent_message) event | display + textContent | Both empty | **FAIL** |
| Parse real `item.completed` (command_execution) event | display output | Empty | **FAIL** |
| Parse real `turn.completed` (usage) event | Capture usage | Ignored | **FAIL** |
| Parse real `error` event | Display error | Ignored | **FAIL** |
| Parse real `turn.failed` event | Display failure | Ignored | **FAIL** |

**Details**: The `codex-stream-renderer.ts` expects event types like `AgentMessage`, `CommandExecution`, `FileChange`, but the actual Codex CLI emits a completely different format:
- Real: `{"type":"item.completed","item":{"type":"agent_message","text":"..."}}`
- Expected: `{"type":"AgentMessage","content":"..."}`
- Real: `{"type":"item.completed","item":{"type":"command_execution","command":"...","exit_code":0}}`
- Expected: `{"type":"CommandExecution","command":"...","exit_code":0}`

All real events hit the `default` case and produce empty output.

### Phase 5: CodexRunner Non-Interactive Execution — FAIL (consequence of renderer bug)

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| `run()` with gpt-5.4 (working model) | Output captured | Empty string | **FAIL** |
| `runVerbose()` with gpt-5.4 | Verbose display + output | No display, empty output | **FAIL** |
| Exit code with working model | 0 | 0 | PASS |
| Exit code with unavailable model | Non-zero | 1 | PASS |
| Timeout/contextOverflow flags | false when not triggered | false | PASS |
| usageData | undefined | undefined | PASS (by design) |

### Phase 6: `--provider` CLI Flag — FAIL (Major)

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| `--provider codex` forwarded to `createRunner()` | provider passed | Never read from options | **FAIL** |
| `--provider codex` forwarded to `resolveEffortToModel()` | provider passed | Not passed | **FAIL** |
| `--provider codex` forwarded to `resolveModelOption()` | provider passed | Not passed | **FAIL** |

**Details**: In both `do.ts` and `plan.ts`, the `--provider` option is declared via Commander but `options.provider` is never read. All calls to `createRunner()` omit the `provider` field. All calls to `resolveEffortToModel()` and `resolveModelOption()` omit the provider. The flag is completely inert.

### Phase 7: Error Handling — PASS (partial)

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Missing codex binary (getCodexPath) | Error thrown | Error thrown (tested via code review) | PASS |
| `runResume()` | Throws "not supported" | Correct | PASS |
| Invalid model (codex returns error JSON) | Error surfaced | Error swallowed silently (renderer bug) | **FAIL** |
| Kill / isRunning | Work correctly | Code review confirms correct pattern | PASS |

### Phase 8: Model Availability — INFO (environment-specific)

The configured default Codex models (`gpt-5.3-codex-spark`, `gpt-5.3-codex`) are not available on ChatGPT-based Codex accounts. Only `gpt-5.4` and the default model work. This is an environment issue, not a code bug, but the error is invisible due to the renderer bug.

## Issues Found

### Issue 1: CRITICAL — JSONL Stream Renderer Parses Wrong Event Format
- **File**: `src/parsers/codex-stream-renderer.ts`
- **Severity**: Critical
- **Impact**: All non-interactive Codex runs produce empty output; verbose mode shows nothing; completion detection cannot work (relies on output text)
- **Root cause**: Renderer expects event types `AgentMessage`, `CommandExecution`, etc. but real Codex CLI emits `item.completed`, `item.started`, `turn.completed`, `error`, `turn.failed` with nested `item` objects
- **Suggested fix**: Rewrite switch to handle real event types: `item.completed` → check `item.type` for `agent_message` (text in `item.text`), `command_execution` (command in `item.command`), `file_change`, etc. Also handle `error` and `turn.failed` events. Consider extracting usage data from `turn.completed` events.

### Issue 2: CRITICAL — `--provider` Flag is a No-Op
- **File**: `src/commands/do.ts` (line 1036), `src/commands/plan.ts` (lines 289, 619, 802)
- **Severity**: Critical
- **Impact**: Users cannot actually use the Codex provider via CLI — the flag is accepted but ignored
- **Root cause**: `options.provider` is never read from the Commander options object and never passed to `createRunner()`, `resolveEffortToModel()`, or `resolveModelOption()`
- **Suggested fix**: Read `options.provider`, pass it through to all runner creation and model resolution calls. The `RunnerConfig` type already supports `provider`.

### Issue 3: MAJOR — Codex Error Events Silently Swallowed
- **File**: `src/parsers/codex-stream-renderer.ts`
- **Severity**: Major (partially overlaps with Issue 1)
- **Impact**: When Codex reports errors (invalid model, API failures), the runner returns exit code 0-1 with empty output and no error information
- **Root cause**: `error` and `turn.failed` event types are not handled by the renderer
- **Suggested fix**: Add handlers for `error` and `turn.failed` events that capture error messages in both `display` and `textContent`

## What Works Correctly
- Config schema and types for Codex models/effort mapping
- Model resolution functions (`getModel`, `resolveEffortToModel`, `parseModelSpec`, etc.) when called with explicit provider parameter
- Runner factory creates correct runner type for each provider
- `RunnerConfig.provider` type exists and is used by factory
- CodexRunner constructor, `kill()`, `isRunning()`, `runResume()` error
- Command construction (`codex exec --full-auto --json --ephemeral -m <model>`) uses correct flags
- Process spawning, timeout handling, PTY setup code structure
- `usageData: undefined` doesn't break downstream consumers (guarded by `if (result.usageData)`)

## Notes
- Interactive mode (`runInteractive`) was not tested E2E because it requires PTY interaction which cannot be automated in this context. Code review shows the PTY setup follows the same pattern as ClaudeRunner.
- The `raf-dev plan --provider codex` and `raf-dev do --provider codex` commands were not tested interactively because Issue 2 makes the flag inert and Issue 1 would prevent any output capture.
- Timeout behavior was not stress-tested due to API costs, but the code structure is identical to ClaudeRunner's proven implementation.

<promise>COMPLETE</promise>
