# Task: Add Auto Flag for Plan Mode

## Objective
Add `--auto` / `-y` CLI flag to `raf plan` command to skip Claude's permission prompts during planning sessions.

## Context
Execution mode (`raf do`) already uses `--dangerously-skip-permissions` for non-interactive Claude sessions. Users may want the same capability during planning to avoid manually approving file writes (decisions.md, plan files). This is useful for automated workflows or when the user trusts Claude's actions.

## Requirements
- Add `--auto` and `-y` flags to the `raf plan` command
- When flag is set, pass `--dangerously-skip-permissions` to Claude
- Works for both regular `raf plan` and `raf plan --amend`
- Flag is opt-in (not the default behavior)
- Maintain interactive TTY behavior (Claude can still ask planning questions)

## Implementation Steps
1. Update `src/commands/plan.ts`:
   - Add `--auto` and `-y` options to Commander.js command definition
   - Pass the flag value to `runPlanCommand()` and `runAmendCommand()`

2. Update `src/core/claude-runner.ts` `runInteractive()`:
   - Add optional `dangerouslySkipPermissions` flag to options
   - When true, include `--dangerously-skip-permissions` in args
   - Method signature: `runInteractive(systemPrompt, userMessage, { dangerouslySkipPermissions?: boolean, ...})`

3. Update `src/commands/plan.ts`:
   - Pass the flag through to `claudeRunner.runInteractive()`

4. Update CLI help text to explain what the flag does:
   - Short description: "Skip Claude's permission prompts"
   - Clarify this is for file write permissions, not for skipping the planning interview

5. Add unit tests for:
   - ClaudeRunner.runInteractive() with dangerouslySkipPermissions option
   - Command option parsing for --auto and -y flags

## Acceptance Criteria
- [ ] `raf plan --auto` or `raf plan -y` starts planning without permission prompts
- [ ] `raf plan --amend <id> --auto` works similarly
- [ ] Regular `raf plan` (without flag) still shows permission prompts
- [ ] Claude's AskUserQuestion prompts for planning interview still work (not bypassed)
- [ ] Help text accurately describes the flag
- [ ] All tests pass

## Notes
- This flag only affects file operation permissions, not the planning interview questions
- The `-y` shorthand matches common CLI conventions (like `apt -y`, `npm -y`)
- Consider adding a warning message when flag is used to remind user that permissions are skipped
- Task 007 (fix-plan-mode-user-prompt) should be completed first as it changes runInteractive() signature
