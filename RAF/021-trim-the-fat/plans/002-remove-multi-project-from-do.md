# Task: Remove Multi-Project Support from raf do

## Objective
Simplify `raf do` to accept only a single project identifier, removing the multi-project execution feature.

## Context
Multi-project support (`raf do 3 4 5`) adds complexity with deduplication, sequential execution, multi-project summaries, and per-project error handling. This simplification reduces code surface area. The single-project interactive picker (`raf do` with no args) and worktree mode remain unchanged.

## Requirements
- Change the command argument from `[projects...]` (variadic) to `[project]` (single optional)
- Remove all multi-project execution logic: the `isMultiProject` flag, the results accumulation loop, and the `printMultiProjectSummary()` function
- Remove the verbose log for multi-project model name (`if (verbose && model && resolvedProjects.length > 1)`)
- Remove the worktree guard for multiple projects (`if (worktreeMode && projectIdentifiers.length > 1)`) since it's no longer possible
- Simplify the standard-mode resolution loop (no need for `seenPaths` deduplication or building a `resolvedProjects` array — just resolve one project)
- Keep all existing single-project behavior: interactive picker, worktree auto-discovery, `--merge`, `--force`, etc.
- Remove the `do-multiproject.test.ts` test file entirely
- Update `do-command.test.ts` if it references multi-project behavior
- Update README.md: remove `raf do 3 4 5` example and `[projects...]` in command reference
- Update CLAUDE.md: remove `### Multi-Project Execution` section from architectural decisions

## Implementation Steps
1. Change the `.argument()` in `createDoCommand()` from `'[projects...]'` to `'[project]'`
2. Update the action handler signature to receive `project: string | undefined` instead of `projects: string[]`
3. Refactor `runDoCommand()` to work with a single optional identifier: no array iteration, no deduplication, no multi-project summary
4. Remove `printMultiProjectSummary()` function
5. Remove or simplify the `ProjectExecutionResult` interface and results accumulation if they become unnecessary
6. Remove `tests/unit/do-multiproject.test.ts`
7. Update any other test files that reference multi-project behavior
8. Update README.md and CLAUDE.md docs

## Acceptance Criteria
- [ ] `raf do 3` works for a single project
- [ ] `raf do` (no args) still shows interactive picker
- [ ] `raf do --worktree` still shows worktree picker
- [ ] `raf do 3 4` produces an error (too many arguments) or ignores extra args
- [ ] `printMultiProjectSummary` and multi-project loop removed
- [ ] `do-multiproject.test.ts` removed
- [ ] README.md and CLAUDE.md updated (no multi-project references)
- [ ] All remaining tests pass

## Notes
- Commander.js with `[project]` (non-variadic) will only capture the first argument — extra arguments are typically ignored. Consider adding explicit validation or letting Commander handle it.
- The `ProjectExecutionResult` type and `executeSingleProject()` function can stay — they're used for the single-project case too. Just remove the array accumulation pattern around them.
- The `--merge` logic depends on `results.every(r => r.success)` — simplify this to just check the single result.
