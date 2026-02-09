# Project Decisions

## How should dependencies be specified in plan files? Should they use task IDs (e.g., `001`, `002`) or full task names?
Task IDs only (Recommended) - Dependencies: 001, 002 - Simple, unambiguous, and matches existing naming.

## Where in the plan file should dependencies be placed?
New 'Dependencies' section (Recommended) - Add a dedicated ## Dependencies section after Context, before Requirements.

## When a dependency fails, what should happen to the dependent task?
Auto-fail with explanation (Recommended) - Mark as FAILED immediately, create outcome file explaining the dependency failure.

## Should there be a new task status 'blocked' (distinct from 'failed') shown in status displays?
Yes, add 'blocked' status (Recommended) - Shows as BLOCKED in status, distinct from tasks that failed on their own.

## How should circular dependencies be handled (e.g., task 002 depends on 003, but 003 depends on 002)?
Add instruction in planning system prompt to order files in suggested order of execution and avoid circular dependencies. No programmatic validation - rely on Claude's planning intelligence.

## Should Claude ask about dependencies during the planning interview, or infer them automatically from task descriptions?
Infer automatically (Recommended) - Claude analyzes task relationships and adds dependencies without asking.

## What dependency context should Claude receive when executing a task that has dependencies?
Show dependency outcomes (Recommended) - Include outcome summaries of completed dependency tasks in execution context.

## What marker should blocked tasks use in their outcome files?
New BLOCKED marker (Recommended) - Use `<promise>BLOCKED</promise>` - distinct from COMPLETE and FAILED.

## [Amendment] For the 'act' alias of 'raf do': Should it be a complete alias (same options, same behavior) or just a shortcut with any differences?
Complete alias (Recommended) - raf act = raf do with all the same options and behavior.

## [Amendment] For the ctrl-c message: When should this message be displayed?
After plan created (Recommended) - Show when planning is complete, before Claude exits.

## [Amendment] What should the exact message say after planning?
Generic message (Recommended) - Press Ctrl-C twice to exit. Then run: raf do <project>

## [Amendment] Should the message also mention that planning can be amended later?
No, keep it simple (Recommended) - Only show ctrl-c and raf do instructions.
