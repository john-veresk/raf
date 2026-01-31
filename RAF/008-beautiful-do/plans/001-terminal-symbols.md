# Task: Create Terminal Symbols Module

## Objective
Create a centralized module defining the visual symbols and formatting helpers for beautiful terminal output.

## Context
RAF needs consistent visual symbols across `do` and `status` commands. This module provides the foundation for the ultra-minimal output style using dots and symbols.

## Requirements
- Symbol palette using dots/symbols style:
  - `●` for running/in-progress
  - `✓` for completed/success
  - `✗` for failed
  - `○` for pending
  - `▶` for project header
- Helper functions for formatting:
  - `formatTaskProgress(current, total, status, name, timer?)` → `● auth-login 1:23`
  - `formatProjectHeader(name, taskCount)` → `▶ my-project (5 tasks)`
  - `formatSummary(completed, failed, pending, elapsed?)` → `✓ 5/5 completed in 12:34`
  - `formatProgressBar(tasks)` → `✓✓●○○` (sequence of task symbols)
- All functions should be pure and testable

## Implementation Steps
1. Create `src/utils/terminal-symbols.ts`
2. Define symbol constants as readonly object
3. Implement `formatTaskProgress()` for single-line task display
4. Implement `formatProjectHeader()` for project header
5. Implement `formatSummary()` for final result line
6. Implement `formatProgressBar()` for compact task status visualization
7. Export all functions and symbols

## Acceptance Criteria
- [ ] Symbol constants defined and exported
- [ ] All formatter functions implemented
- [ ] Functions handle edge cases (empty names, zero tasks)
- [ ] All tests pass

## Notes
- Keep functions pure - no side effects, no console output
- Timer format should match existing `formatElapsedTime()` from timer.ts
- Consider terminal width for very long task names (truncate if needed)
