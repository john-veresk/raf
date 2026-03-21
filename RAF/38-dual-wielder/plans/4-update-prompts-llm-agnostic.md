---
effort: medium
---
# Task: Update Prompts to be LLM-Agnostic

## Objective
Remove Claude-specific language from all prompt templates so they work with any LLM provider.

## Context
The prompts in `src/prompts/` contain Claude-specific references like "Claude Code", "Claude CLI", "Claude session", and "Claude model". These need to be made generic since the prompts will now be sent to either Claude or Codex.

## Dependencies
1

## Requirements
- Replace Claude-specific references in all prompt files with generic alternatives
- Update the execution prompt, planning prompt, and amend prompt
- Keep the prompts' functional content identical — only change naming/branding
- Update any log messages that reference "Claude" in the runner and command files

## Implementation Steps

1. **Update `src/prompts/execution.ts`**:
   - Replace "Claude" references in prompt text with generic terms
   - `"You are executing a planned task for RAF"` — already generic, keep as-is
   - Check for any Claude-specific tool names or behaviors mentioned in the prompt

2. **Update `src/prompts/planning.ts`**:
   - `"Take roughly 10-30 minutes of work for Claude"` → `"Take roughly 10-30 minutes of work"`
   - `"which Claude model will execute the task"` → `"which model will execute the task"`
   - Review entire planning prompt for Claude-specific language

3. **Update `src/prompts/amend.ts`**:
   - Same treatment as planning prompt
   - `"which Claude model will execute the task"` → `"which model will execute the task"`

4. **Update log messages in `src/core/claude-runner.ts`**:
   - `"Starting interactive Claude session"` → `"Starting interactive session"` or include provider name dynamically
   - `"Starting Claude execution session"` → `"Starting execution session"`
   - `"Claude session timed out"` → `"Session timed out"`
   - `"terminating Claude process"` → `"terminating process"`
   - `"Claude exited with code"` → `"Process exited with code"`
   - `"Claude stderr"` → `"Process stderr"`

5. **Update `src/core/pull-request.ts`**:
   - `callClaudeForPrBody` → `callLlmForPrBody` (or keep internal name, just update error messages)
   - `"Claude CLI not found"` → make provider-aware or generic

6. **Update `src/index.ts`**:
   - `.description('RAF - Automated Task Planning & Execution with Claude Code')` → `'RAF - Automated Task Planning & Execution'`

7. **Update `src/parsers/stream-renderer.ts`** doc comments:
   - `"Event types from claude -p --output-format stream-json --verbose"` → make generic or note it's Claude-specific

8. **Scan for remaining references**:
   - Search entire `src/` for strings containing "claude" (case-insensitive)
   - Skip: file names that will be addressed by the runner refactoring, type names with backward-compat re-exports
   - Update any user-facing messages, error messages, and comments

## Acceptance Criteria
- [ ] No user-facing prompt text mentions "Claude" specifically
- [ ] Log messages are provider-generic or include provider name dynamically
- [ ] CLI description is LLM-agnostic
- [ ] All prompts still function correctly (no broken templates)
- [ ] TypeScript compiles without errors

## Notes
- Internal code comments mentioning "Claude" are lower priority but should be updated where easy
- File names like `claude-runner.ts` don't need to change — they're internal implementation files for the Claude provider
- The planning prompt is also used as the system prompt for this very planning session, but that's fine — it's a template, not a runtime concern
