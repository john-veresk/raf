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

## [Amendment] When should the outcomes be committed - automatically after each task completes, or only when the entire project (all tasks) is marked complete?
On project complete - commit all outcomes together when the final task in the project is completed.

## [Amendment] What should be included in the commit when the project completes?
Full project folder - commit the entire project folder (plans, outcomes, decisions, input, etc.).

## [Amendment] How should the commit message be formatted?
Use format: `RAF(project): outcomes` - e.g., `RAF(005-task-naming-improvements): outcomes`

## [Amendment] Where should this commit logic be triggered from?
Inside `raf do` - automatically detect project completion at the end of `raf do` when final task succeeds.

## [Amendment] What should happen if there are other uncommitted changes in the repo when project completes?
Commit only project - stage and commit only the project folder, leave other changes unstaged.

## [Amendment] Should task 005 be updated or should a new task supersede it for the new commit format?
Update task 005 directly - PENDING tasks are allowed to be amended. Also create a new task to update the amend prompts to reflect this rule.

## [Amendment] What is the exact universal commit schema format?
- Task commits: `RAF[005:001] project-name task-name`
- Plan commits: `RAF[005:plan]`
- Outcome commits: `RAF[005:outcome]`

## [Amendment] Where do task commits happen?
Claude makes task commits during execution - need to update prompts that Claude uses.

## [Amendment] Should plan commits be automated via Claude or RAF?
Plan commits are done by RAF programmatically (not Claude) - format `RAF[005:plan]`.
