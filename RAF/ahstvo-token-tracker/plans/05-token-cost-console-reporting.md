# Task: Add Token/Cost Reporting to Console Output

## Objective
Display per-task token usage and cost estimates after each task, and a grand total after all tasks complete.

## Context
With token tracking infrastructure in place (task 04), this task wires it into the `raf do` execution flow to display usage reports in the terminal. This is the user-facing part of the feature.

## Dependencies
04

## Requirements
- After each task completes, print a concise usage summary line to the console
- After all tasks finish (or project completes), print a grand total summary
- Show: input tokens, output tokens, cache tokens (combined read+creation), estimated cost in USD
- Format numbers with thousands separators for readability (e.g., `12,345`)
- Format cost as USD with 2-4 decimal places (e.g., `$1.23` or `$0.0042`)
- Keep the output compact — avoid verbose multi-line reports for each task
- Respect the existing console output style (chalk colors, log levels, etc.)

## Implementation Steps
1. In `src/commands/do.ts`, instantiate a `TokenTracker` at the start of project execution
2. After each task execution, feed the returned `UsageData` into the tracker
3. Print a per-task summary line after each task completes (e.g., `  Tokens: 5,234 in / 1,023 out | Cache: 18,500 read | Est. cost: $0.42`)
4. After all tasks complete, print a total summary section with aggregated stats
5. Handle edge cases: tasks that fail before returning usage data, context overflow, timeouts
6. Use existing logging/formatting utilities (chalk, logger) for consistent styling
7. Update CLAUDE.md and README.md to document the token tracking feature

## Acceptance Criteria
- [ ] Per-task token summary displayed after each task completion
- [ ] Grand total displayed after all tasks finish
- [ ] Numbers are formatted with thousands separators
- [ ] Cost displayed in USD format
- [ ] Failed tasks that have partial usage data are still included in totals
- [ ] Tasks with no usage data (timeout, crash) are handled gracefully
- [ ] Output is compact and doesn't overwhelm the console
- [ ] CLAUDE.md updated with token tracking documentation
- [ ] All tests pass

## Notes
- Example per-task output format:
  ```
  Task 01 complete ✓
    Tokens: 5,234 in / 1,023 out | Cache: 18,500 read | Est. cost: $0.42
  ```
- Example total output format:
  ```
  ── Token Usage Summary ──────────────────
  Total tokens: 45,678 in / 12,345 out
  Cache: 125,000 read / 8,000 created
  Estimated cost: $3.75
  ─────────────────────────────────────────
  ```
- These are just examples — the implementing agent should match the existing output style
