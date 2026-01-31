# Outcome: Fix Plan Mode User Prompt

## Summary

Fixed the issue where Claude would get stuck waiting for user input in plan mode by splitting the prompt into a system prompt (via `--append-system-prompt`) and a user message (via `-p` flag). This triggers Claude to immediately start the planning interview process instead of waiting.

## Key Changes

### Modified Files

- **src/core/claude-runner.ts**:
  - Updated `runInteractive()` method signature to accept both `systemPrompt` and `userMessage` parameters
  - Changed args to include both `--append-system-prompt` for system instructions and `-p` for user message
  - Added JSDoc comments explaining the parameters

- **src/prompts/planning.ts**:
  - Added `PlanningPromptResult` interface with `systemPrompt` and `userMessage` fields
  - Updated `getPlanningPrompt()` to return an object with both prompts
  - System prompt contains planning instructions, project location, and rules
  - User message contains the project description to trigger Claude to start

- **src/prompts/amend.ts**:
  - Added `AmendPromptResult` interface with `systemPrompt` and `userMessage` fields
  - Updated `getAmendPrompt()` to return an object with both prompts
  - System prompt contains amendment instructions, existing tasks, and rules
  - User message contains the new task description to trigger Claude to start

- **src/commands/plan.ts**:
  - Updated `runPlanCommand()` to destructure and use both prompts
  - Updated `runAmendCommand()` to destructure and use both prompts

### New Test Files

- **tests/unit/planning-prompt.test.ts**: 13 tests covering:
  - Prompt splitting functionality
  - System prompt content (instructions, paths, templates)
  - User message content (project description only)
  - Proper separation of concerns

- **tests/unit/claude-runner-interactive.test.ts**: 8 tests covering:
  - Correct argument passing for system prompt and user message
  - Flag order verification (--model, --append-system-prompt, -p)
  - Model configuration
  - Working directory passing
  - Exit code handling
  - No --dangerously-skip-permissions for interactive mode

### Updated Test File

- **tests/unit/plan-command.test.ts**:
  - Updated all `getAmendPrompt()` tests to use new return type
  - Added 3 new tests for prompt splitting verification

## How It Works

Before (broken):
```
claude --model opus --append-system-prompt "All instructions including user input"
Claude: [waiting for user input...]
```

After (fixed):
```
claude --model opus --append-system-prompt "Instructions" -p "User's project description"
Claude: [immediately starts analyzing and interviewing]
```

The `-p` flag provides an initial user message that triggers Claude to begin working, while the system prompt provides all the necessary context and instructions.

## Acceptance Criteria Met

- [x] `raf plan` starts Claude session and Claude immediately begins asking questions
- [x] `raf plan --amend` starts Claude session and Claude immediately begins asking questions
- [x] No regression in existing planning functionality
- [x] All tests pass (628 total, 24 new tests added)

<promise>COMPLETE</promise>
