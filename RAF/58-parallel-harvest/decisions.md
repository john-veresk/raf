# Project Decisions

## When multiple projects are selected, should they run sequentially or in parallel?
Sequential. Run projects one after another — simpler, no resource contention, easier to follow output.

## Should the picker default to multi-select, or require a flag?
Always multi-select. The picker always allows selecting multiple projects. Selecting one still works fine.

## Should `raf do` also accept multiple project names as CLI arguments?
Yes. Allow passing multiple project identifiers as positional args (e.g. `raf do project1 project2`), bypassing the picker.

## Should the AI merge resolution run interactively or non-interactively?
Non-interactive. Fully automated — RAF invokes claude -p with merge instructions, no user intervention. Consistent with how task execution works.

## If the AI also fails to resolve merge conflicts, what should happen?
Abort merge (git merge --abort) to restore clean state, then warn user to merge manually.

## What commit message format should the AI-resolved merge use?
RAF prefix format, e.g. `RAF[project-name] Merge: branch-name into main` — consistent with other RAF commits.

## Should the worktree removal order change for AI merge?
Yes. New flow: attempt merge in main repo first, if conflicts arise invoke AI to resolve, then remove worktree after successful merge. (Previously worktree was removed before merge attempt.)
