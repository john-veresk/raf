# Project Decisions

## For the task number in progress reporting, what format would you like?
[NNN] prefix - Shows as '[001] task-name' - task ID prefix style

## Where should the [NNN] prefix appear?
Both places - Show [NNN] prefix in both the spinner during execution and in the completion summary

## For the 'plan' prompt update, what level of detail is acceptable?
Paths are OK if referencing previous plan/output and the project. Avoid code snippets and implementation specifics otherwise.

## For the 'do' prompt, should Task tool and subagents be mandatory or recommended?
Mandatory - Every task execution must use Task tool and subagents, no exceptions.
