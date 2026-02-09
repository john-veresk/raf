# Task: Fix Plan Mode User Prompt

## Objective
Fix Claude getting stuck in plan mode by splitting the prompt into system instructions and user message, so Claude immediately starts the interview process.

## Context
Currently, `runInteractive()` passes everything via `--append-system-prompt` without a user message. Claude waits for user input instead of starting the planning interview. Non-interactive execution (`run()`/`runVerbose()`) already works correctly because it passes a user message via `-p`.

This affects both:
- `raf plan` (regular planning)
- `raf plan --amend` (amendment mode)

## Requirements
- Pass planning instructions via `--append-system-prompt` (system prompt)
- Pass the user's project description via `-p` flag (user message)
- This applies to both regular plan and amend modes
- Claude should immediately begin identifying tasks and preparing questions
- The prompt structure should mirror the non-interactive execution pattern

## Implementation Steps
1. Update `src/core/claude-runner.ts` `runInteractive()` method:
   - Add a second parameter for user message content
   - Pass system instructions via `--append-system-prompt`
   - Pass user message via `-p` flag
   - Method signature: `runInteractive(systemPrompt: string, userMessage: string, options?)`

2. Update `src/prompts/planning.ts`:
   - Split `getPlanningPrompt()` into two functions or return an object with both parts
   - System prompt: Planning instructions, project location, rules
   - User message: The actual project description (input.md content)

3. Update `src/prompts/amend.ts`:
   - Split `getAmendPrompt()` similarly
   - System prompt: Amendment instructions, existing tasks, rules
   - User message: The new task description

4. Update `src/commands/plan.ts`:
   - Update `runPlanCommand()` to call `runInteractive()` with both prompts
   - Update `runAmendCommand()` to call `runInteractive()` with both prompts

5. Add/update unit tests for:
   - ClaudeRunner.runInteractive() accepting both system and user prompts
   - Planning prompt split functions
   - Amend prompt split functions

## Acceptance Criteria
- [ ] `raf plan` starts Claude session and Claude immediately begins asking questions
- [ ] `raf plan --amend` starts Claude session and Claude immediately begins asking questions
- [ ] No regression in existing planning functionality
- [ ] All tests pass

## Notes
- The user message triggers Claude to start working, while system prompt provides the context
- This mirrors how execution mode already works with the `-p 'Execute the task...'` pattern
- Keep the existing logic for processing Claude's output after the session
