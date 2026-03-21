# Task: Use System Prompt Append for RAF Instructions

## Objective
Change RAF to pass its prompts using Claude CLI's `--system-prompt-append` flag instead of as user messages.

## Context
Currently RAF passes its instructions (planning prompts, execution prompts) as the initial user message to Claude. This gives them lower precedence in Claude's attention. By using `--system-prompt-append`, RAF's instructions will appear in the system prompt section, directly above tool definitions, giving them stronger precedence and better adherence.

## Requirements
- Use `--system-prompt-append` CLI flag to pass RAF's prompts
- This applies to both interactive (`runInteractive`) and non-interactive (`run`, `runVerbose`) modes
- The prompt content remains the same - only the delivery mechanism changes
- Preserve Claude Code's built-in functionality (system preset is preserved)

## Implementation Steps

1. **Research Claude CLI flags**:
   - Verify `--system-prompt-append` flag exists and its exact syntax
   - May need to check Claude CLI help: `claude --help`

2. **Update `ClaudeRunner.runInteractive()`**:
   - Change from passing prompt as positional argument
   - Use `--system-prompt-append <prompt>` flag instead
   - The prompt should still contain all RAF instructions

3. **Update `ClaudeRunner.run()`**:
   - Currently uses `-p` flag for prompt
   - Change to use `--system-prompt-append` flag
   - Keep `--dangerously-skip-permissions` flag

4. **Update `ClaudeRunner.runVerbose()`**:
   - Same changes as `run()`
   - Ensure verbose output still works correctly

5. **Test manually**:
   - Run `raf plan` and verify planning works correctly
   - Run `raf do` and verify execution works correctly
   - Check that Claude follows RAF instructions well

6. **Add/update tests**:
   - Verify correct flags are passed to Claude CLI
   - Mock spawn/pty and verify arguments

## Acceptance Criteria
- [ ] RAF uses `--system-prompt-append` flag for all Claude invocations
- [ ] Planning mode (`raf plan`) works correctly with appended system prompt
- [ ] Execution mode (`raf do`) works correctly with appended system prompt
- [ ] Claude's built-in tools and functionality remain available
- [ ] RAF instructions have better adherence (subjective, test manually)
- [ ] All existing tests pass

## Notes
- The `--system-prompt-append` flag preserves Claude Code's built-in system prompt while adding custom instructions
- This is different from `--system-prompt` which would replace the entire system prompt
- If the flag syntax is different than expected, adjust implementation accordingly
- May need to escape special characters in the prompt content for shell safety
