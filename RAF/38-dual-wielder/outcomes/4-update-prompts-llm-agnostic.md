# Task 4: Update Prompts to be LLM-Agnostic

## Summary
Removed Claude-specific language from all user-facing prompt templates, log messages, CLI descriptions, error messages, and doc comments so they work with any LLM provider.

## Changes Made

### Prompt Files
- **`src/prompts/planning.ts`**: Removed "for Claude" from task sizing guidance, changed "Claude model" to "model", updated doc comment
- **`src/prompts/amend.ts`**: Same changes as planning.ts — removed "Claude model" references, updated doc comment
- **`src/prompts/execution.ts`**: Already generic, no changes needed
- **`src/prompts/config-docs.md`**: Updated "Claude Model Selection" → "Model Selection", "Claude models" → "models", "Claude automatically commits" → "RAF automatically commits", "For Claude — Config Editing" → "Config Editing Session Instructions"

### Core Files
- **`src/core/claude-runner.ts`**: Made all log messages generic ("Starting interactive session", "Session timed out", "Process exited", "Process stderr"), updated all doc comments
- **`src/core/pull-request.ts`**: Updated error messages ("CLI not found", "Process exited with code", "LLM returned empty output"), updated doc comments
- **`src/core/failure-analyzer.ts`**: Updated user-facing failure analysis text ("The API returned", "The LLM is stuck", "context grew too large for the LLM"), updated doc comments
- **`src/core/runner-interface.ts`**: No changes needed (already mentions both runners by class name)

### Command Files
- **`src/index.ts`**: `'RAF - Automated Task Planning & Execution with Claude Code'` → `'RAF - Automated Task Planning & Execution'`
- **`src/commands/plan.ts`**: Updated description, option help text (`'Model to use'`, `'Skip permission prompts'`), log messages (`'Starting planning session...'`, `'The planner will interview you'`)
- **`src/commands/do.ts`**: Updated option help text (`'Show full LLM output'`, `'Model to use'`), updated comments
- **`src/commands/config.ts`**: Updated description (`'View and edit RAF configuration interactively'`), log messages, doc comments

### Parser & Utility Files
- **`src/parsers/stream-renderer.ts`**: Updated doc comment ("LLM response" instead of "Claude's response")
- **`src/parsers/output-parser.ts`**: Updated doc comments
- **`src/utils/name-generator.ts`**: Updated all doc comments and debug log messages
- **`src/utils/validation.ts`**: Updated error message for missing CLI
- **`src/utils/token-tracker.ts`**: Updated comments ("CLI-provided" instead of "Claude-provided")

## What Was NOT Changed (By Design)
- Internal variable/type names (`ClaudeRunner`, `claudeRunner`, `ClaudeModelAlias`, `callClaudeForPrBody`, etc.) — these are internal implementation details
- Literal `'claude'` as a provider value — it's a valid provider name
- Claude model ID strings/patterns (`claude-opus-4-6`) — these are actual model identifiers
- File names (`claude-runner.ts`) — internal implementation files for the Claude provider
- Backward-compatible re-exports

## Acceptance Criteria
- [x] No user-facing prompt text mentions "Claude" specifically
- [x] Log messages are provider-generic or include provider name dynamically
- [x] CLI description is LLM-agnostic
- [x] All prompts still function correctly (no broken templates)
- [x] TypeScript compiles without errors

## Notes
- The pre-existing `name-generator.test.ts` failure (hardcoded `haiku` expectation vs config default `sonnet`) remains — unrelated to this task.

<promise>COMPLETE</promise>
