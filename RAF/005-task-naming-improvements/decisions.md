# Project Decisions

## For `raf status`, should it work exactly like `raf do` where you can pass a number (3, 003), base36 (a00), or project name? Any additional behavior differences?
Same as `raf do` PLUS support for full folder names like `001-fix-stuff` or `a01-important-project`.

## When using `raf plan` with an existing project identifier (e.g., `raf plan 3`), what should happen?
Show error saying project already exists, require explicit `--amend` flag to modify existing plans.

## What operations should `--amend` support for existing plans?
Add new tasks only - only allow adding new tasks to the end of the plan, preserving existing task numbers.

## How should `raf plan --amend` be invoked?
`raf plan --amend <id>` - require project identifier with --amend flag.

## When in amend mode, should Claude see the existing tasks and their status?
Full context - show all existing tasks with their status (completed/pending/failed) so Claude can make informed decisions about new tasks.

## Should `raf do` also support full folder names like `001-fix-stuff`?
Yes, for consistency - all commands should support the same identifier formats.

## In amend mode, how should the user provide input for new tasks?
Same as current plan implementation - editor first for user to describe new tasks, then interactive Claude session. The only difference is that Claude will have context of existing tasks and their status.

## What should happen if `--amend` is used on a project that's fully completed?
Allow with warning - show warning that project is complete but allow adding new tasks.

## Should the enhanced identifier support task-level references for future extensibility?
Yes, design the resolution function to be extensible for task-level references like `001-project/002-task` in the future.
