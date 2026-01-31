# Task: Add Exit Instructions After Planning

## Objective
After Claude finishes creating plans, display a message instructing the user how to exit Claude (double Ctrl-C) and how to execute the tasks.

## Context
When `raf plan` runs, Claude operates in an interactive TTY session. After planning is complete, users may not know how to exit the Claude session. This message provides clear guidance.

## Requirements
- Show message after Claude completes plan creation
- Message should mention: "Press Ctrl-C twice to exit"
- Message should mention: "Then run: raf do <project>"
- Keep the message simple and generic (don't include specific project identifier)

## Implementation Steps
1. Open `src/prompts/planning.ts`
2. In the system prompt, add a "Step 4: Confirm Completion" section after "Step 3: Create Plan Files"
3. Instruct Claude to output a completion message that includes:
   - Confirmation that planning is done
   - "Press Ctrl-C twice to exit"
   - "Then run: raf do <project>"
4. Similarly update `src/prompts/amend.ts` to include the same exit message for amendment mode

## Acceptance Criteria
- [ ] After `raf plan` completes, Claude displays exit instructions
- [ ] After `raf plan --amend` completes, Claude displays exit instructions
- [ ] Message is clear and actionable
- [ ] Message uses generic `<project>` placeholder (not actual project name)

## Notes
The message should be part of Claude's output (in the system prompt), not RAF's output after Claude exits. This ensures the user sees it while Claude is still running.
