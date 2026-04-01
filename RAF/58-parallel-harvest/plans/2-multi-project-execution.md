---
effort: medium
---
# Task: Multi-Project Sequential Execution in `raf do`

## Objective
Update the `raf do` command to accept multiple project arguments and execute selected projects sequentially.

## Context
Task 1 updated the picker to return multiple selections. Now `raf do` needs to handle that array — and also accept multiple CLI arguments (e.g. `raf do project1 project2`). Each project runs to completion before the next one starts.

## Dependencies
1 (see outcomes/1-multi-select-picker.md)

## Requirements
- Change the Commander argument from `[project]` (single optional) to `[projects...]` (variadic)
- When no arguments provided and picker returns multiple selections, execute each sequentially
- When multiple CLI arguments provided, resolve each and execute sequentially
- Each project's full task loop runs to completion before starting the next
- If a project fails (has failed tasks after exhausting retries), continue to the next project — don't abort the whole batch
- Print a summary at the end showing which projects completed, which had failures
- The existing single-project flow must still work identically (one selection = same behavior as before)

## Implementation Steps
1. In `src/commands/do.ts`, update `createDoCommand()`:
   - Change `.argument('[project]', ...)` to `.argument('[projects...]', 'Project identifiers: ID, name, or folder. Multiple allowed.')`
   - Update the action signature from `(project: string | undefined, ...)` to `(projects: string[], ...)`
2. Refactor `runDoCommand`:
   - Rename parameter to `projectIdentifiersArg: string[]`
   - When array is empty (no CLI args), call `pickPendingProjects()` from the updated picker — this returns `PickerResult[]`
   - Build a list of `{ identifier, source, worktreeRoot }` entries to process
3. Extract the existing single-project execution logic into a helper function, e.g. `executeProject(projectIdentifier, options, worktreeRoot?, originalBranch?)`:
   - This function contains the current project resolution + task execution loop (lines ~275 onward)
   - Returns a result object like `{ identifier: string, success: boolean }`
4. Add an outer loop in `runDoCommand` that iterates over the list of projects:
   ```typescript
   const results: { identifier: string; success: boolean }[] = [];
   for (const project of projectsToRun) {
     const result = await executeProject(project.identifier, options, project.worktreeRoot, originalBranch);
     results.push(result);
   }
   ```
5. After the loop, print a batch summary:
   - List completed projects (all tasks passed)
   - List failed projects (had task failures)
   - Exit with code 1 if any project failed
6. Remove the now-unused `select` import from `do.ts` if it was only used for project picking

## Acceptance Criteria
- [ ] `raf do project1 project2 project3` executes all three projects sequentially
- [ ] `raf do` with no args shows multi-select picker; selected projects run sequentially
- [ ] `raf do single-project` still works exactly as before (single project, no summary needed for one)
- [ ] A failing project does not abort execution of subsequent projects
- [ ] A batch summary is printed when multiple projects were executed
- [ ] Exit code is 1 if any project in the batch failed, 0 if all succeeded
- [ ] The `select` import in `do.ts` is cleaned up if no longer needed

## Notes
- Commander's variadic argument `[projects...]` returns `string[]` — an empty array when no args given, which is our trigger to show the picker
- The biggest part of this task is extracting the single-project execution into a reusable function. Be careful to preserve all existing behavior (worktree detection, post-execution actions, token tracking, etc.)
- The post-execution action picker (merge/pr/leave) that exists for worktree projects should still run per-project, not once at the end
- Keep the `--force`, `--timeout`, `--verbose`, `--debug` flags working — they apply to all projects in the batch
