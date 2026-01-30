# Project Decisions

## Task 1: Multi-Project Execution

### For multi-project execution, should projects run sequentially or in parallel?
**Answer:** Sequential - Run projects one after another, safer for git commits

### When running multiple projects, if one fails should we continue with remaining projects?
**Answer:** Continue - Continue with remaining projects, report failures at end

### For number-based selection (e.g., 'raf do 003 004'), should we support ranges like '003-005'?
**Answer:** No, individual only - Only support listing individual numbers

## Task 2: Auto-Commit After Planning

### For auto-commit after planning, what commit message format should be used?
**Answer:** RAF(project-name): Plan complete - Consistent with current task commit format

## Task 3: Commit Outcomes with Changes

### Should the outcome be committed in the SAME commit as task changes?
**Answer:** Same commit - Outcome file included in task's commit

## Task 4: Re-Run Failed Tasks / State Derivation

### How should we determine if a task is 'completed'?
**Answer:** Outcome file exists - Task is complete if outcomes/NNN-task.md exists with success marker

### Should we completely remove the .raf folder and state.json?
**Answer:** Yes, remove completely - Derive everything from RAF/project folders

### When re-running 'raf do project-name' on a project with failures, what should happen?
**Answer:** Resume from failed/pending - Skip completed tasks, retry failed and pending tasks

## Task 5: Simplify Git Logic

### Should Claude be instructed to commit, or should RAF commit after task completion?
**Answer:** Claude commits (instructed) - Add instructions for Claude to commit after making changes

### Should the 'smart commit' logic (baseline tracking, filtering) be simplified or removed?
**Answer:** Remove, commit all - Remove smart filtering, commit all changes after task

### When Claude is instructed to commit, what commit message format should Claude use?
**Answer:** [project] task description (no numbers) - Custom format specified by user

## Task 6: Per-Task Timeout

### Is the timeout issue that multiple retries extend beyond 60 min total?
**Answer:** Just verify/document - Verify current implementation and add tests

## Additional Decisions

### Where should execution logs be stored?
**Answer:** No logs, console only - Don't persist logs, show in terminal only

### What marker should indicate success vs failure in outcome files?
**Answer:** Content marker at top - "## Status: SUCCESS" or "## Status: FAILED" in file

### How should 'raf status' work without state.json?
**Answer:** Scan RAF folder, derive status - List projects by scanning RAF/, derive status from files

### Should RAF support running a project that's already fully completed?
**Answer:** Allow with --force flag - Require --force flag to re-run completed project

## Task 8: Move Decisions File

### Should decisions be stored in a folder or as a single file?
**Answer:** Single file at project root - Move from `decisions/DECISIONS.md` to `decisions.md`
